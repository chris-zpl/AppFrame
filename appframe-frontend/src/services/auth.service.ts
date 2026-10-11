import api from './api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  auth_provider: 'local' | 'google';
  is_two_factor_enabled: boolean;
  created_at: string;
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
  device_name: string;
  ip_address: string;
  user_agent: string;
  last_active_at: string;
  is_current: boolean;
}

export const authService = {
  async register(data: { name: string; email: string; password: string }): Promise<AuthTokens> {
    const res = await api.post<any>('/auth/register', data);
    return res.data?.data || res.data;
  },

  async login(data: { email: string; password: string }): Promise<AuthTokens> {
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

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getSessions(): Promise<ActiveSession[]> {
    const res = await api.get<any>('/auth/sessions');
    return res.data?.data || res.data;
  },

  async revokeSession(id: string): Promise<{ revoked: boolean }> {
    const res = await api.delete<{ revoked: boolean }>(`/auth/sessions/${id}`);
    return res.data;
  },

  async revokeOtherSessions(): Promise<{ revokedCount: number }> {
    const res = await api.post<{ revokedCount: number }>('/auth/sessions/revoke-others');
    return res.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ success: boolean }> {
    const res = await api.post<{ success: boolean }>('/auth/change-password', data);
    return res.data;
  },

  async deleteAccount(data: { password?: string; confirmation: string }): Promise<{ deleted: boolean }> {
    const res = await api.delete<{ deleted: boolean }>('/auth/account', { data });
    return res.data;
  },
};
