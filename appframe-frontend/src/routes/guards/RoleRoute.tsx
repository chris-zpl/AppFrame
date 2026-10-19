import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, hasRole } from '../../features/auth';

export interface RoleRouteProps {
  roles: ('SUPER_ADMIN' | 'ADMIN' | 'USER')[];
  redirectTo?: string;
  children: React.ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({
  roles,
  redirectTo = '/varredura',
  children,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#f8f9fd] dark:bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(user, roles)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
