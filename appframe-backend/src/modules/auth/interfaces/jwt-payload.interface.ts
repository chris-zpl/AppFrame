import { UserRole } from '../../users/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: UserRole;
  sessionId?: string;
  purpose?: 'access' | 'refresh' | '2fa_challenge';
  rememberMe?: boolean;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
}
