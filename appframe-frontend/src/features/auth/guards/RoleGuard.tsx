import React from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { hasRole } from '../utils/auth.helpers';

export interface RoleGuardProps {
  roles: ('SUPER_ADMIN' | 'ADMIN' | 'USER')[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Componente Guard para renderização condicional de elementos na interface com base no perfil/role do usuário.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles,
  fallback = null,
  children,
}) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !hasRole(user, roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
