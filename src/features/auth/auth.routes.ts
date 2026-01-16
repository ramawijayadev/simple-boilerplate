import { Router } from 'express';
import { validate } from '@/shared/middlewares/validation.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/features/auth/auth.schema';
import {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  me,
} from '@/features/auth/auth.controller';
import { authenticate } from '@/shared/middlewares/auth.middleware';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

export default router;
