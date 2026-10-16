import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, isPublicAuthRoute } from '../../contexts/AuthContext';
import { isAdminUser } from '../../features/auth';

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    const fromPath = (location.state as any)?.from?.pathname;
    const fromSearch = (location.state as any)?.from?.search || '';
    const fromUrl = fromPath ? `${fromPath}${fromSearch}` : null;

    let lastActive: string | null = null;
    try {
      lastActive = sessionStorage.getItem('appframe_last_active_route');
    } catch {}

    let target =
      fromUrl && !isPublicAuthRoute(fromUrl)
        ? fromUrl
        : lastActive && !isPublicAuthRoute(lastActive)
        ? lastActive
        : '/varredura';

    if (target.startsWith('/admin') && !isAdminUser(user)) {
      target = '/varredura';
    }

    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
