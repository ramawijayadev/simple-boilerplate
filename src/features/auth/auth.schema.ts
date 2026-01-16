import { z } from 'zod';

export const registerSchema = {
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
  }),
};

export const loginSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
};

export const verifyEmailSchema = {
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
};

export const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email('Invalid email address'),
  }),
};

export const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(12, 'Password must be at least 12 characters'),
  }),
};
