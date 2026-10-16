import type { ActiveSession } from '../../auth';
import type { UserSessionItem } from '../interfaces';

export const extractBrowserFromUserAgent = (userAgent?: string | null): string => {
  if (!userAgent) return 'Navegador Web';

  const edgeMatch = userAgent.match(/Edg\/([\d.]+)/);
  if (edgeMatch) return `Edge ${edgeMatch[1]}`;

  const oprMatch = userAgent.match(/(?:OPR|Opera)\/([\d.]+)/);
  if (oprMatch) return `Opera ${oprMatch[1]}`;

  const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
  if (chromeMatch) return `Chrome ${chromeMatch[1]}`;

  const firefoxMatch = userAgent.match(/Firefox\/([\d.]+)/);
  if (firefoxMatch) return `Firefox ${firefoxMatch[1]}`;

  const safariMatch = userAgent.match(/Version\/([\d.]+).*Safari/);
  if (safariMatch) return `Safari ${safariMatch[1]}`;

  if (userAgent.includes('Safari/')) return 'Safari';
  return 'Navegador Web';
};

export const extractIconFromSession = (
  userAgent?: string | null,
  deviceName?: string | null
): string => {
  const combined = `${userAgent || ''} ${deviceName || ''}`.toLowerCase();
  if (
    combined.includes('iphone') ||
    combined.includes('android') ||
    combined.includes('mobile')
  ) {
    return 'smartphone';
  }
  if (combined.includes('ipad') || combined.includes('tablet')) {
    return 'tablet_mac';
  }
  if (
    combined.includes('macintosh') ||
    combined.includes('macos') ||
    combined.includes('mac os')
  ) {
    return 'laptop_mac';
  }
  if (combined.includes('windows') || combined.includes('linux')) {
    return 'desktop_windows';
  }
  return 'devices';
};

export const formatRelativeTime = (
  dateString?: string,
  isCurrent?: boolean
): string => {
  if (isCurrent) return 'Ativo agora';
  if (!dateString) return 'Recente';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recente';

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'Ativo agora';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `Há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  }

  return date.toLocaleDateString('pt-BR');
};

export const mapActiveSessionToItem = (session: ActiveSession): UserSessionItem => ({
  id: session.id,
  deviceName: session.device_name || 'Dispositivo Desconhecido',
  browser: extractBrowserFromUserAgent(session.user_agent),
  ipAddress: session.ip_address || 'IP não disponível',
  isCurrent: Boolean(session.is_current),
  lastActiveAt: formatRelativeTime(session.last_active_at, session.is_current),
  icon: extractIconFromSession(session.user_agent, session.device_name),
});

export const extractApiErrorMessage = (error: any, fallback: string): string => {
  const apiMessage = error?.response?.data?.message;
  if (Array.isArray(apiMessage) && apiMessage.length > 0) {
    return String(apiMessage[0]);
  }
  if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
    return apiMessage;
  }
  return fallback;
};

export const calculateNextEmailChangeDate = (fromDate: Date): string => {
  const nextDate = new Date(fromDate);
  nextDate.setMonth(nextDate.getMonth() + 6);
  return nextDate.toLocaleDateString('pt-BR');
};
