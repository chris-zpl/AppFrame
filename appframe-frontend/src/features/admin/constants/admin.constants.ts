export interface AuditEventBadgeInfo {
  label: string;
  icon: string;
  className: string;
}

export const getAuditEventBadge = (rawAction: string): AuditEventBadgeInfo => {
  const action = (rawAction || '').trim().toUpperCase();
  switch (action) {
    case 'LEGAL_DOCUMENTS_UPDATED':
      return {
        label: 'Termos & Privacidade Atualizados',
        icon: 'gavel',
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      };
    case 'USER_ROLE_CHANGED':
    case 'ROLE_CHANGED':
      return {
        label: 'Perfil / Função Alterada',
        icon: 'admin_panel_settings',
        className: 'bg-purple-500/20 text-purple-400 border border-purple-500/40',
      };
    case 'USER_BLOCKED':
      return {
        label: 'Usuário Bloqueado',
        icon: 'block',
        className: 'bg-red-500/20 text-red-400 border border-red-500/40',
      };
    case 'USER_UNBLOCKED':
      return {
        label: 'Usuário Desbloqueado',
        icon: 'check_circle',
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      };
    case 'GEMINI_KEY_SAVED':
      return {
        label: 'Chave Gemini Salva',
        icon: 'auto_awesome',
        className: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      };
    case 'GEMINI_KEY_DELETED':
      return {
        label: 'Chave Gemini Removida',
        icon: 'delete_forever',
        className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      };
    case 'YOUTUBE_COOKIES_SAVED':
      return {
        label: 'Cookies YouTube Salvos',
        icon: 'cookie',
        className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      };
    case 'YOUTUBE_COOKIES_DELETED':
      return {
        label: 'Cookies YouTube Removidos',
        icon: 'delete',
        className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      };
    case 'PASSWORD_RESET_REQUESTED':
      return {
        label: 'Redefinição Solicitada',
        icon: 'lock_reset',
        className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      };
    case 'PASSWORD_RESET_COMPLETED':
      return {
        label: 'Senha Redefinida (Link)',
        icon: 'key',
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      };
    case 'PASSWORD_CHANGED':
      return {
        label: 'Senha Alterada',
        icon: 'password',
        className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      };
    case 'PROFILE_EMAIL_CHANGED':
      return {
        label: 'E-mail Alterado',
        icon: 'mail',
        className: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
      };
    case 'PROFILE_NAME_CHANGED':
      return {
        label: 'Nome Alterado',
        icon: 'badge',
        className: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      };
    case 'GOOGLE_ACCOUNT_LINKED':
      return {
        label: 'Google Vinculado',
        icon: 'link',
        className: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      };
    case 'GOOGLE_ACCOUNT_UNLINKED':
      return {
        label: 'Google Desvinculado',
        icon: 'link_off',
        className: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
      };
    case 'TWO_FACTOR_ENABLED':
      return {
        label: '2FA Ativado',
        icon: 'verified_user',
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
      };
    case 'TWO_FACTOR_DISABLED':
      return {
        label: '2FA Desativado',
        icon: 'gpp_bad',
        className: 'bg-red-500/15 text-red-400 border border-red-500/30',
      };
    case 'SESSION_REVOKED':
      return {
        label: 'Sessão Encerrada',
        icon: 'logout',
        className: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
      };
    case 'ALL_SESSIONS_REVOKED':
      return {
        label: 'Todas Sessões Encerradas',
        icon: 'power_settings_new',
        className: 'bg-red-500/20 text-red-300 border border-red-500/40',
      };
    default:
      return {
        label: action,
        icon: 'info',
        className: 'bg-surface-container-highest text-on-surface-variant border border-surface-container-highest',
      };
  }
};

export const parseDevice = (ua: string | null): string => {
  if (!ua) return 'Dispositivo Desconhecido';
  if (ua.includes('iPhone')) return 'iPhone (iOS)';
  if (ua.includes('iPad')) return 'iPad (iOS)';
  if (ua.includes('Android')) return 'Android Mobile';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'Mac / macOS';
  if (ua.includes('Windows')) return 'Windows PC';
  if (ua.includes('Linux')) return 'Linux PC';
  return 'Web / Outro';
};
