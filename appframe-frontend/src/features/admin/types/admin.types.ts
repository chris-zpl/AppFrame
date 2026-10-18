import type {
  AdminUser,
  AdminSession,
  SmtpConfig,
  AdminAuditLog,
  YouTubeCookiesStatus,
  GeminiStatus,
  SaveLegalSettingsDto,
  LegalDocumentsResponse,
} from '../services';

export type AdminTab = 'users' | 'youtube' | 'gemini' | 'smtp' | 'audit' | 'legal';

export type {
  AdminUser,
  AdminSession,
  SmtpConfig,
  AdminAuditLog,
  YouTubeCookiesStatus,
  GeminiStatus,
  SaveLegalSettingsDto,
  LegalDocumentsResponse,
};
