import { z } from 'zod';

/**
 * Registration Input Validation
 */
export const registerSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
};

/**
 * Login Input Validation
 */
export const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
};

/**
 * Refresh Token Validation
 */
export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
};

/**
 * Email Verification Validation
 */
export const verifyEmailSchema = {
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
};

/**
 * Forgot Password Validation
 */
export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
};

/**
 * Reset Password Validation
 */
export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
};
