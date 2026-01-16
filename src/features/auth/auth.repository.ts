import { prisma } from '@/shared/utils/prisma';
import type { User, UserSession, EmailVerificationToken, PasswordResetToken } from '@prisma/client';
import { RegisterInput } from '@/features/auth/auth.types';

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function findUserById(id: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function createUser(
  input: RegisterInput,
  hashedPassword: string,
  emailVerificationTokenHash: string,
  tokenExpiresAt: Date
): Promise<User> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        isActive: true,
      },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: emailVerificationTokenHash,
        expiresAt: tokenExpiresAt,
      },
    });

    return user;
  });
}

export async function updateUserLoginStats(
  userId: number,
  data: {
    failedLoginAttempts?: number;
    lockedUntil?: Date | null;
    lastLoginAt?: Date;
  }
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data,
  });
}

export async function createSession(data: {
  userId: number;
  refreshTokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}): Promise<UserSession> {
  return prisma.userSession.create({
    data: {
      userId: data.userId,
      refreshTokenHash: data.refreshTokenHash,
      userAgent: data.userAgent,
      ipAddress: data.ipAddress,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findSessionByHash(refreshTokenHash: string): Promise<UserSession | null> {
  return prisma.userSession.findFirst({
    where: {
      refreshTokenHash,
      revokedAt: null,
      deletedAt: null,
    },
    include: {
      user: true,
    },
  });
}

export async function revokeSession(sessionId: number): Promise<UserSession> {
  return prisma.userSession.update({
    where: { id: sessionId },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function rotateSession(
  oldSessionId: number,
  newSessionData: {
    userId: number;
    refreshTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }
): Promise<UserSession> {
  return prisma.$transaction(async (tx) => {
    await tx.userSession.update({
      where: { id: oldSessionId },
      data: { revokedAt: new Date() },
    });

    return tx.userSession.create({
      data: {
        userId: newSessionData.userId,
        refreshTokenHash: newSessionData.refreshTokenHash,
        userAgent: newSessionData.userAgent,
        ipAddress: newSessionData.ipAddress,
        expiresAt: newSessionData.expiresAt,
      },
    });
  });
}

export async function createPasswordResetToken(data: {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
}): Promise<PasswordResetToken> {
  return prisma.passwordResetToken.create({
    data,
  });
}

export async function findPasswordResetToken(
  tokenHash: string
): Promise<(PasswordResetToken & { user: User }) | null> {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });
}

export async function markPasswordResetTokenUsed(id: number): Promise<PasswordResetToken> {
  return prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export async function resetPassword(
  userId: number,
  tokenId: number,
  newHashedPassword: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        password: newHashedPassword,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });

    await tx.userSession.updateMany({
      where: {
        userId: userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  });
}

export async function findEmailVerificationToken(
  tokenHash: string
): Promise<EmailVerificationToken | null> {
  return prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });
}

export async function verifyEmail(userId: number, tokenId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    await tx.emailVerificationToken.update({
      where: { id: tokenId },
      data: {
        usedAt: new Date(),
      },
    });
  });
}
