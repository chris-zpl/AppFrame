import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, isPublicAuthRoute } from '../../features/auth';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Rastreia a última rota protegida navegada para redirecionamento inteligente (ignora área administrativa)
  useEffect(() => {
    if (isAuthenticated && !isPublicAuthRoute(location.pathname) && !location.pathname.startsWith('/admin')) {
      try {
        sessionStorage.setItem('appframe_last_active_route', location.pathname + location.search);
      } catch {}
    }
  }, [isAuthenticated, location.pathname, location.search]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#f8f9fd] dark:bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-neutral-600 dark:text-on-surface-variant text-sm font-medium">Validando sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
