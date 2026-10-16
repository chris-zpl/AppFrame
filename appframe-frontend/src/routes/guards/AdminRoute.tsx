import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email === 'christian.zimpel@gmail.com';
  const isAdmin = isSuperAdmin || user?.role === 'ADMIN';

  if (!isAdmin) {
    return <Navigate to="/varredura" replace />;
  }

  return <>{children}</>;
};
