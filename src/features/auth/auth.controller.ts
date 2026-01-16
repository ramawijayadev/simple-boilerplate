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
import { sendOk, sendCreated, getRequestId } from '@/shared/utils/apiResponse';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await registerService(req.body);

    sendCreated(res, result, { requestId: getRequestId(req) });
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

    sendOk(res, tokens, { requestId: getRequestId(req) });
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

    sendOk(res, tokens, { requestId: getRequestId(req) });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      sendOk(res, null);
      return;
    }

    const userSession = req.user as unknown as UserSessionPayload;

    await logoutService(userSession);

    sendOk(res, null, { requestId: getRequestId(req) });
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

    sendOk(res, user, { requestId: getRequestId(req) });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await verifyEmailService(req.body);

    sendOk(res, null, { requestId: getRequestId(req) });
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

    sendOk(res, null, { requestId: getRequestId(req) });
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

    sendOk(res, null, { requestId: getRequestId(req) });
  } catch (error) {
    next(error);
  }
}
