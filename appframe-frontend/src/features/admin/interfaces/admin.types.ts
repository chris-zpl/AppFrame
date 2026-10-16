import type {
  AdminUser,
  AdminSession,
  SmtpConfig,
  AdminAuditLog,
  YouTubeCookiesStatus,
  GeminiStatus,
} from '../../../services/admin.service';
import type {
  SaveLegalSettingsDto,
  LegalDocumentsResponse,
} from '../../../services/legal.service';

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
