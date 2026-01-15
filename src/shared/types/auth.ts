export interface UserSessionPayload {
  userId: number;
  sessionId: number;
  role?: string;
  iat?: number;
  exp?: number;
  aud?: string;
  iss?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
