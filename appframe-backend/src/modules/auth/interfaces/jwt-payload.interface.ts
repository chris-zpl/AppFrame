export interface JwtPayload {
  sub: string;
  email: string;
  sessionId?: string;
  purpose?: 'access' | 'refresh' | '2fa_challenge';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  sessionId: string;
}
