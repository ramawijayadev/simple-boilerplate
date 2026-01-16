import { Request, Response, NextFunction } from 'express';
import {
  register as registerService,
  login as loginService,
  refresh as refreshService,
  logout as logoutService,
  verifyEmail as verifyEmailService,
  forgotPassword as forgotPasswordService,
  resetPassword as resetPasswordService,
  getProfile as getProfileService,
} from '@/features/auth/auth.service';
import { UserSessionPayload } from '@/features/auth/auth.types';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await registerService(req.body);

    res.status(201).json({
      success: true,
      data: result,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = {
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    const tokens = await loginService(input);

    res.status(200).json({
      success: true,
      data: tokens,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = {
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };

    const tokens = await refreshService(input);

    res.status(200).json({
      success: true,
      data: tokens,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(200).json({ success: true, message: 'Logged out successfully' });
      return;
    }

    const userSession = req.user as unknown as UserSessionPayload;

    await logoutService(userSession);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { userId } = req.user as UserSessionPayload;
    const user = await getProfileService(userId);

    res.status(200).json({
      success: true,
      data: user,
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await verifyEmailService(req.body);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await forgotPasswordService(req.body);

    res.status(200).json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await resetPasswordService(req.body);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
      requestId: req.id,
    });
  } catch (error) {
    next(error);
  }
}
