export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserSessionPayload {
  userId: number;
  sessionId: number;
  role?: string; // Future proofing
}

export interface JWTPayload {
  userId: number;
  sessionId: number;
  role?: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
}
