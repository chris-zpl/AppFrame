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

export type {
  UserProfile,
  AuthTokens,
  ActiveSession,
  Generate2faResponse,
};

