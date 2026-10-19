import { queryClient } from '../../../lib/queryClient';

export const isPublicAuthRoute = (path?: string): boolean => {
  if (!path) return false;
  const clean = path.toLowerCase().replace(/\/+$/, '') || '/';
  return (
    clean === '/login' ||
    clean === '/register' ||
    clean.startsWith('/auth/callback') ||
    clean === '/auth-callback' ||
    clean === '/2fa' ||
    clean === '/recuperar-senha' ||
    clean === '/forgot-password' ||
    clean === '/reset-password' ||
    clean.startsWith('/reset-password/')
  );
};

export const SUPER_ADMIN_EMAIL = 'christian.zimpel@gmail.com';

export interface UserRoleLike {
  role?: 'SUPER_ADMIN' | 'ADMIN' | 'USER' | string | null;
  email?: string | null;
}

/**
 * Verifica se o usuário autenticado possui privilégios de Super Administrador.
 */
export const isSuperAdminUser = (user: UserRoleLike | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.email === SUPER_ADMIN_EMAIL;
};

/**
 * Verifica se o usuário autenticado é Administrador ou Super Administrador.
 */
export const isAdminUser = (user: UserRoleLike | null | undefined): boolean => {
  if (!user) return false;
  return isSuperAdminUser(user) || user.role === 'ADMIN';
};

/**
 * Verifica se o usuário possui algum dos papéis especificados na lista.
 */
export const hasRole = (
  user: UserRoleLike | null | undefined,
  roles: ('SUPER_ADMIN' | 'ADMIN' | 'USER')[]
): boolean => {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  return Boolean(user.role && (roles as string[]).includes(user.role));
};

/**
 * Calcula a rota de destino pós-login baseada no histórico de navegação e permissões do usuário.
 */
export const getAuthRedirectTarget = (
  user: UserRoleLike | null | undefined,
  fromPath?: string | null
): string => {
  let lastActive: string | null = null;
  try {
    lastActive = sessionStorage.getItem('appframe_last_active_route');
  } catch {}

  let target =
    fromPath && !isPublicAuthRoute(fromPath)
      ? fromPath
      : lastActive && !isPublicAuthRoute(lastActive)
      ? lastActive
      : '/varredura';

  if (target.startsWith('/admin') && !isAdminUser(user)) {
    target = '/varredura';
  }

  return target;
};

/**
 * Limpa todos os caches em memória (React Query), estados temporários do scanner,
 * fila e preview do Studio do cliente ao efetuar logout.
 * Preserva as preferências visuais (ex: tema) e NÃO afeta o histórico de vídeos
 * (jobs e arquivos finais persistem no backend respeitando suas próprias regras).
 */
export const cleanupClientCacheAndPreviews = (): void => {
  try {
    queryClient.clear();
  } catch (err) {
    console.warn('Falha ao limpar queryClient:', err);
  }

  try {
    sessionStorage.clear();
  } catch (err) {
    console.warn('Falha ao limpar sessionStorage:', err);
  }

  try {
    // Chaves específicas conhecidas a remover
    localStorage.removeItem('appframe_has_session');
    localStorage.removeItem('appframe_remember_me');
    localStorage.removeItem('appframe_scanner_cache');
    localStorage.removeItem('appframe_active_render_job');
    localStorage.removeItem('appframe_default_watermark_id');

    // Chaves dinâmicas de preview / studio / scanner
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('appframe_studio_state_') ||
        key.startsWith('appframe_preview_') ||
        key.startsWith('appframe_scanner_')
      ) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (err) {
    console.warn('Falha ao limpar localStorage no logout:', err);
  }
};

