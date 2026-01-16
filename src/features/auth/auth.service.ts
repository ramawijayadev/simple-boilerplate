import jwt, { SignOptions } from 'jsonwebtoken';
import { addMinutes, addDays, isAfter } from 'date-fns';
import { config } from '@/config';
import { sendEmail } from '@/shared/utils/mailer';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
} from '@/shared/utils/crypto';
import * as authRepository from '@/features/auth/auth.repository';
import {
  UserSessionPayload,
  AuthTokens,
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@/features/auth/auth.types';
import {
  UnauthorizedError,
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from '@/shared/errors';

// Dummy hash for timing attack mitigation
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$eprA2z2fyrvIF8a5ZMzbSg$/XUlFrh99IiT3TZRtL/0deGSKGIxKVB7GeEvM0a81GA';

function generateAccessToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiration as SignOptions['expiresIn'],
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

function generateRefreshToken(): string {
  return generateRandomToken();
}

export async function register(
  input: RegisterInput
): Promise<{ message: string; user: { id: number; email: string; name: string } }> {
  const existingUser = await authRepository.findUserByEmail(input.email);

  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  const hashedPassword = await hashPassword(input.password);

  const verificationToken = generateRandomToken();
  const verificationTokenHash = await hashToken(verificationToken);
  const tokenExpiresAt = addMinutes(new Date(), config.auth.emailTokenExpiresMinutes);

  const newUser = await authRepository.createUser(
    input,
    hashedPassword,
    verificationTokenHash,
    tokenExpiresAt
  );

  const verifyUrl = `${config.app.url}/verify-email?token=${verificationToken}`;

  await sendEmail(
    input.email,
    'Verify your email',
    `Please verify your email by clicking: ${verifyUrl}`
  );

  return {
    message: 'Registration successful. Please check your email to verify your account.',
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    },
  };
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const user = await authRepository.findUserByEmail(input.email);

  // Timing Mitigation: Always verify password, even if user not found
  // If user exists and has password, use it. Otherwise use dummy.
  const targetHash = user?.password ? user.password : DUMMY_HASH;
  const isValidPassword = await verifyPassword(input.password, targetHash);

  // 1. If password invalid (or user not found which implies invalid against dummy), throw generic error
  if (!isValidPassword || !user) {
    if (user) {
      // Record failed attempt if user exists (even if we don't tell them)
      const attempts = user.failedLoginAttempts + 1;
      let lockedUntil = null;

      if (attempts >= config.auth.maxLoginAttempts) {
        lockedUntil = addMinutes(new Date(), config.auth.lockDurationMinutes);
      }

      await authRepository.updateUserLoginStats(user.id, {
        failedLoginAttempts: attempts,
        lockedUntil: lockedUntil,
      });
    }

    throw new UnauthorizedError('Invalid credentials');
  }

  // 2. Check Account Status (Only reachable if password and user are valid)
  if (user.deletedAt) {
    throw new UnauthorizedError('Invalid credentials'); // Mask deleted users
  }

  if (!user.isActive) {
    throw new ForbiddenError('Account is inactive');
  }

  if (user.lockedUntil && isAfter(user.lockedUntil, new Date())) {
    throw new ForbiddenError(`Account locked until ${user.lockedUntil.toISOString()}`);
  }

  // Reset login statistics on success...
  await authRepository.updateUserLoginStats(user.id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
  });

  // Create the session and tokens...
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashToken(refreshToken);
  const expiresAt = addDays(new Date(), config.auth.refreshTokenExpiresDays);

  const session = await authRepository.createSession({
    userId: user.id,
    refreshTokenHash,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    expiresAt,
  });

  const accessToken = generateAccessToken({
    userId: user.id,
    sessionId: session.id,
    role: 'user',
  });

  return { accessToken, refreshToken };
}

export async function refresh(input: RefreshTokenInput): Promise<AuthTokens> {
  const refreshTokenHash = await hashToken(input.refreshToken);

  const session = await authRepository.findSessionByHash(refreshTokenHash);

  if (!session) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (isAfter(new Date(), session.expiresAt)) {
    throw new UnauthorizedError('Session expired');
  }

  if (session.revokedAt || session.deletedAt) {
    throw new UnauthorizedError('Session revoked');
  }

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = await hashToken(newRefreshToken);
  const newExpiresAt = addDays(new Date(), config.auth.refreshTokenExpiresDays);

  const newSession = await authRepository.rotateSession(session.id, {
    userId: session.userId,
    refreshTokenHash: newRefreshTokenHash,
    userAgent: input.userAgent || session.userAgent || undefined,
    ipAddress: input.ipAddress || session.ipAddress || undefined,
    expiresAt: newExpiresAt,
  });

  const accessToken = generateAccessToken({
    userId: session.userId,
    sessionId: newSession.id,
    role: 'user',
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(encodedUser: UserSessionPayload): Promise<void> {
  await authRepository.revokeSession(encodedUser.sessionId);
}

export async function verifyEmail(input: VerifyEmailInput): Promise<void> {
  const tokenHash = await hashToken(input.token);

  const tokenRecord = await authRepository.findEmailVerificationToken(tokenHash);

  if (!tokenRecord) {
    throw new NotFoundError('Invalid verification token');
  }

  if (tokenRecord.usedAt) {
    throw new ValidationError('Token already used');
  }

  if (isAfter(new Date(), tokenRecord.expiresAt)) {
    throw new ValidationError('Token expired');
  }

  await authRepository.verifyEmail(tokenRecord.userId, tokenRecord.id);
}

export async function getProfile(userId: number) {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Deselect sensitive fields if not handled by repository/ORM
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _password, ...profile } = user;
  return profile;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await authRepository.findUserByEmail(input.email);

  if (!user) {
    // Timing Mitigation: Simulate work to prevent enumeration
    await verifyPassword('dummy', DUMMY_HASH);
    return;
  }

  const token = generateRandomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = addMinutes(new Date(), config.auth.passwordResetTokenExpiresMinutes);

  await authRepository.createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${config.app.url}/reset-password?token=${token}`;

  await sendEmail(
    user.email,
    'Reset your password',
    `Click here to reset your password: ${resetUrl}`
  );
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = await hashToken(input.token);

  const tokenRecord = await authRepository.findPasswordResetToken(tokenHash);

  if (!tokenRecord) {
    throw new NotFoundError('Invalid or expired reset token');
  }

  if (tokenRecord.usedAt || isAfter(new Date(), tokenRecord.expiresAt)) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const hashedPassword = await hashPassword(input.password);

  await authRepository.resetPassword(tokenRecord.user.id, tokenRecord.id, hashedPassword);

  await sendEmail(
    tokenRecord.user.email,
    'Password Changed',
    'Your password has been successfully changed.'
  );
}
