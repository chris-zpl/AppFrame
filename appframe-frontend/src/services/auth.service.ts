import api from './api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  google_id?: string | null;
  auth_provider: 'local' | 'google';
  is_two_factor_enabled: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  user?: UserProfile;
  requires2fa?: boolean;
  require_2fa?: boolean;
  tempToken?: string;
  temp_token?: string;
}

export interface ActiveSession {
  id: string;
  user_id?: string;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at?: string;
  expires_at?: string;
  is_current: boolean;
}

export interface Generate2faResponse {
  secret: string;
  qr_code_data_url: string;
  recovery_codes: string[];
}

export const authService = {
  async register(data: { name: string; email: string; password: string }): Promise<AuthTokens> {
    const res = await api.post<any>('/auth/register', data);
    return res.data?.data || res.data;
  },

  async login(data: { email: string; password: string; rememberMe?: boolean }): Promise<AuthTokens> {
    const res = await api.post<any>('/auth/login', data);
    return res.data?.data || res.data;
  },

  async verify2fa(data: { tempToken: string; token: string }): Promise<AuthTokens> {
    const res = await api.post<any>('/auth/2fa/verify', data);
    return res.data?.data || res.data;
  },

  async getMe(): Promise<UserProfile> {
    const res = await api.get<any>('/auth/me');
    return res.data?.data || res.data;
  },

  async updateProfile(data: { name?: string; email?: string }): Promise<UserProfile> {
    const res = await api.patch<any>('/auth/profile', data);
    return res.data?.data || res.data;
  },

  async unlinkGoogle(): Promise<UserProfile> {
    const res = await api.post<any>('/auth/google/unlink');
    return res.data?.data || res.data;
  },

  async generate2fa(): Promise<Generate2faResponse> {
    const res = await api.post<any>('/auth/2fa/generate');
    return res.data?.data || res.data;
  },

  async enable2fa(token: string): Promise<{ success: boolean }> {
    const res = await api.post<any>('/auth/2fa/enable', { token });
    return res.data?.data || res.data;
  },

  async disable2fa(token: string): Promise<{ success: boolean }> {
    const res = await api.post<any>('/auth/2fa/disable', { token });
    return res.data?.data || res.data;
  },

  async getRecoveryCodes(): Promise<{ recovery_codes: string[] }> {
    const res = await api.get<any>('/auth/2fa/recovery-codes');
    return res.data?.data || res.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getSessions(): Promise<ActiveSession[]> {
    const res = await api.get<any>('/auth/sessions');
    return res.data?.data || res.data;
  },

  async revokeSession(id: string): Promise<{ revoked: boolean }> {
    const res = await api.delete<any>(`/auth/sessions/${id}`);
    return res.data?.data || res.data;
  },

  async revokeOtherSessions(): Promise<{ revokedCount: number }> {
    const res = await api.post<any>('/auth/sessions/revoke-others');
    return res.data?.data || res.data;
  },

  async changePassword(data: { currentPassword?: string; newPassword: string }): Promise<{ success: boolean }> {
    const res = await api.post<any>('/auth/change-password', data);
    return res.data?.data || res.data;
  },

  async deleteAccount(data: { password?: string; confirmation?: string }): Promise<{ deleted: boolean }> {
    const res = await api.delete<any>('/auth/account', { data });
    return res.data?.data || res.data;
  },
};
