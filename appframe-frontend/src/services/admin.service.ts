import api from './api';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  is_active: boolean;
  created_at: string;
  total_renders: number;
  active_sessions_count: number;
}

export interface AdminSession {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  device_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
  expires_at: string;
  is_current: boolean;
  user_role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  fromName: string;
  fromEmail: string;
  secure: boolean;
}

export interface GeminiStatus {
  configured: boolean;
  hasKey: boolean;
  maskedKey?: string | null;
}

export interface YouTubeCookiesStatus {
  hasCookies: boolean;
  filePath?: string;
  updatedAt?: string | null;
  sizeBytes?: number;
}

export const adminService = {
  // Gestão de Usuários
  async listUsers(): Promise<AdminUser[]> {
    const res = await api.get<AdminUser[]>('/admin/users');
    return res.data;
  },

  async updateUserRole(userId: string, role: 'SUPER_ADMIN' | 'ADMIN' | 'USER'): Promise<{ success: boolean; user: AdminUser }> {
    const res = await api.patch<{ success: boolean; user: AdminUser }>(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<{ success: boolean; user?: AdminUser }> {
    const res = await api.patch<{ success: boolean; user?: AdminUser }>(`/admin/users/${userId}/status`, {
      is_active: isActive,
      isActive,
    });
    return res.data;
  },

  // Gestão de Sessões Ativas
  async listActiveSessions(): Promise<AdminSession[]> {
    const res = await api.get<AdminSession[]>('/admin/users/sessions');
    return res.data;
  },

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await api.delete<{ success: boolean }>(`/admin/users/sessions/${sessionId}`);
    return res.data;
  },

  // Gestão Global de Cookies do YouTube
  async getYoutubeCookiesStatus(): Promise<YouTubeCookiesStatus> {
    const res = await api.get<YouTubeCookiesStatus>('/admin/settings/youtube-cookies');
    return res.data;
  },

  async saveYoutubeCookies(cookiesText: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/admin/settings/youtube-cookies', { cookiesText });
    return res.data;
  },

  async deleteYoutubeCookies(): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>('/admin/settings/youtube-cookies');
    return res.data;
  },

  // Gestão Global de Google Gemini AI
  async getGeminiStatus(): Promise<GeminiStatus> {
    const res = await api.get<GeminiStatus>('/admin/settings/gemini');
    return res.data;
  },

  async saveGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/admin/settings/gemini', { apiKey });
    return res.data;
  },

  async testGemini(apiKey?: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/admin/settings/gemini/test', { apiKey });
    return res.data;
  },

  async deleteGeminiApiKey(): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<{ success: boolean; message: string }>('/admin/settings/gemini');
    return res.data;
  },

  // Configurações SMTP
  async getSmtpConfig(): Promise<SmtpConfig> {
    const res = await api.get<SmtpConfig>('/admin/settings/smtp');
    return res.data;
  },

  async saveSmtpConfig(config: SmtpConfig): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/admin/settings/smtp', config);
    return res.data;
  },

  async testSmtp(toEmail: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post<{ success: boolean; message: string }>('/admin/settings/smtp/test', { toEmail });
    return res.data;
  },
};
