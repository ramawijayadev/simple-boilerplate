import { describe, it, expect, vi, beforeEach } from 'vitest';
import { User, UserSession } from '@prisma/client';
import * as authService from '../auth.service';
import * as authRepository from '../auth.repository';
import { UnauthorizedError, ValidationError, ForbiddenError } from '../../../shared/errors';
import argon2 from 'argon2';

// Mock Repository Layer
vi.mock('../auth.repository', () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUserLoginStats: vi.fn(),
  createSession: vi.fn(),
  findSessionByHash: vi.fn(),
  rotateSession: vi.fn(),
  revokeSession: vi.fn(),
  findEmailVerificationToken: vi.fn(),
  verifyEmail: vi.fn(),
  createPasswordResetToken: vi.fn(),
  findPasswordResetToken: vi.fn(),
  markPasswordResetTokenUsed: vi.fn(),
  resetPassword: vi.fn(),
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue(null);
      vi.mocked(authRepository.createUser).mockResolvedValue({ id: 1 } as User);

      const result = await authService.register({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({ 
        message: 'Registration successful. Please check your email to verify your account.' 
      });
      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Test' }), 
        expect.any(String), // hashed password
        expect.any(String), // hashed token
        expect.any(Date)
      );
    });

    it('should throw if email already exists', async () => {
      vi.mocked(authRepository.findUserByEmail).mockResolvedValue({ id: 1 } as User);

      await expect(
        authService.register({
          name: 'Test',
          email: 'exists@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      // Use real Argon2 hash for consistency
      const password = 'password123';
      const hash = await argon2.hash(password);

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: hash,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      };

      vi.mocked(authRepository.findUserByEmail).mockResolvedValue(mockUser as User);
      vi.mocked(authRepository.createSession).mockResolvedValue({ id: 100 } as UserSession);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(authRepository.createSession).toHaveBeenCalled();
      expect(authRepository.updateUserLoginStats).toHaveBeenCalledWith(1, expect.objectContaining({ failedLoginAttempts: 0 }));
    });

    it('should throw UnauthorizedError on wrong password and increment failures', async () => {
       const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: '$argon2id$v=19$m=65536,t=3,p=4$somehash...$somehash', // Dummy hash
        isActive: true,
        failedLoginAttempts: 0,
      };

      vi.mocked(authRepository.findUserByEmail).mockResolvedValue(mockUser as User);
      
      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow(UnauthorizedError);

      expect(authRepository.updateUserLoginStats).toHaveBeenCalledWith(
        1, 
        expect.objectContaining({ failedLoginAttempts: 1 })
      );
    });

    it('should throw ForbiddenError if account locked', async () => {
      const mockUser = {
        id: 1,
        isActive: true,
        lockedUntil: new Date(Date.now() + 1000 * 60 * 10), // Locked 10 mins future
      };

      vi.mocked(authRepository.findUserByEmail).mockResolvedValue(mockUser as User);

      await expect(
        authService.login({
          email: 'locked@example.com',
          password: 'password',
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
