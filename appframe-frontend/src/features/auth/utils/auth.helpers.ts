import { isPublicAuthRoute } from '../../../contexts/AuthContext';

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
