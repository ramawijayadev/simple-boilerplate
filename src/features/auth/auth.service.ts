/**
 * Auth Service
 *
 * core business logic for authentication.
 * Includes helpers for Crypto (Argon2, JWT) and Email (Mailpit).
 */

import jwt from 'jsonwebtoken';
import { addMinutes, addDays, isAfter } from 'date-fns';
import { config } from '../../config';
import { sendEmail } from '../../shared/utils/mailer';
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
} from '../../shared/utils/crypto';
import * as authRepository from './auth.repository';
import {
  RegisterInput,
  LoginInput,
  AuthTokens,
  UserSessionPayload,
  JWTPayload,
  RefreshTokenInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.types';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ForbiddenError,
} from '../../shared/errors';

// ============================================
// Core Logic
// ============================================

/**
 * Generate a new JWT access token for the given payload.
 *
 * @param  payload  The user session payload
 */
function generateAccessToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '15m',
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

/**
 * Generate a cryptographically secure refresh token.
 */
function generateRefreshToken(): string {
  return generateRandomToken();
}

/**
 * Register a new user and send verification email.
 *
 * @param  input  The registration data
 * @throws ValidationError
 */
export async function register(input: RegisterInput): Promise<{ message: string }> {
  // Check for existing user registration...
  const existingUser = await authRepository.findUserByEmail(input.email);
  
  if (existingUser) {
    throw new ValidationError('Email already registered');
  }

  // Hash the user's password...
  const hashedPassword = await hashPassword(input.password);

  // Prepare verification token...
  const verificationToken = generateRandomToken();
  const verificationTokenHash = await hashToken(verificationToken);
  const tokenExpiresAt = addMinutes(new Date(), config.auth.emailTokenExpiresMinutes);

  await authRepository.createUser(input, hashedPassword, verificationTokenHash, tokenExpiresAt);

  // Dispatch verification email...
  const verifyUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;
  
  await sendEmail(
    input.email,
    'Verify your email',
    `Please verify your email by clicking: ${verifyUrl}`
  );

  return { message: 'Registration successful. Please check your email to verify your account.' };
}

/**
 * Authenticate a user and create a new session.
 *
 * @param  input  The login credentials
 * @throws UnauthorizedError|ForbiddenError
 */
export async function login(input: LoginInput): Promise<AuthTokens> {
  const user = await authRepository.findUserByEmail(input.email);

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.isActive) {
    throw new ForbiddenError('Account is inactive');
  }

  if (user.lockedUntil && isAfter(user.lockedUntil, new Date())) {
    throw new ForbiddenError(`Account locked until ${user.lockedUntil.toISOString()}`);
  }

  // Verify the password...
  const isValidPassword = await verifyPassword(input.password, user.password!);

  if (!isValidPassword) {
    const attempts = user.failedLoginAttempts + 1;
    let lockedUntil = null;

    if (attempts >= config.auth.maxLoginAttempts) {
      lockedUntil = addMinutes(new Date(), config.auth.lockDurationMinutes);
    }

    await authRepository.updateUserLoginStats(user.id, {
      failedLoginAttempts: attempts,
      lockedUntil: lockedUntil,
    });

    throw new UnauthorizedError('Invalid credentials');
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

/**
 * Refresh an existing session with a valid refresh token.
 *
 * @param  input  The refresh token input
 * @throws UnauthorizedError
 */
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
  
  // Rotate the session token (Security Best Practice)...
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

/**
 * Revoke the user's current session.
 *
 * @param  encodedUser  The current user session payload
 */
export async function logout(encodedUser: UserSessionPayload): Promise<void> {
  await authRepository.revokeSession(encodedUser.sessionId);
}

/**
 * Verify a user's email address using a token.
 *
 * @param  input  The verification token
 * @throws NotFoundError|ValidationError
 */
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

/**
 * Initiate the password reset process.
 *
 * @param  input  The user's email address
 */
export async function forgotPassword(input: ForgotPasswordInput): Promise<void> {
  const user = await authRepository.findUserByEmail(input.email);
  
  if (!user) return; // Fail silently to prevent enumeration

  const token = generateRandomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = addMinutes(new Date(), config.auth.passwordResetTokenExpiresMinutes);

  await authRepository.createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `http://localhost:3000/reset-password?token=${token}`;
  
  await sendEmail(
    user.email,
    'Reset your password',
    `Click here to reset your password: ${resetUrl}`
  );
}

/**
 * Reset the user's password using a valid token.
 *
 * @param  input  The reset token and new password
 * @throws NotFoundError|ValidationError
 */
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
  
  await sendEmail(tokenRecord.user.email, 'Password Changed', 'Your password has been successfully changed.');
}
