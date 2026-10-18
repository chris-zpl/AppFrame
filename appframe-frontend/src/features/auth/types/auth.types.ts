import type {
  UserProfile,
  AuthTokens,
  ActiveSession,
  Generate2faResponse,
} from '../services/auth.service';

export type TwoFactorMode = 'totp' | 'backup';

export interface TwoFactorChallengeParams {
  tempToken?: string;
  email?: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requires2fa?: boolean; tempToken?: string; user?: UserProfile }>;
  register: (name: string, email: string, password: string) => Promise<{ user?: UserProfile }>;
  verify2fa: (tempToken: string, token: string) => Promise<{ user?: UserProfile }>;
  handleOAuthCallback: (accessToken?: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (tokenOverride?: string) => Promise<UserProfile | null>;
}

export type {
  UserProfile,
  AuthTokens,
  ActiveSession,
  Generate2faResponse,
};

