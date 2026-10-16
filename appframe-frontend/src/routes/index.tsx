import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth, isPublicAuthRoute } from '../contexts/AuthContext';
import {
  RegisterPage,
  LoginPage,
  AuthCallbackPage,
  TwoFactorChallengePage,
  ScraperPage,
  StudioPage,
  WatermarksPage,
  HistoryPage,
  SettingsPage,
  AdminPage,
  ResetPasswordPage,
  LegalPage,
} from '../pages';

// Componente para proteção de rotas privadas
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Rastreia a última rota protegida navegada para redirecionamento inteligente (ignora área administrativa)
  React.useEffect(() => {
    if (isAuthenticated && !isPublicAuthRoute(location.pathname) && !location.pathname.startsWith('/admin')) {
      try {
        sessionStorage.setItem('appframe_last_active_route', location.pathname + location.search);
      } catch {}
    }
  }, [isAuthenticated, location.pathname, location.search]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-on-surface-variant text-sm font-medium">Validando sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Componente para proteção de rotas exclusivas de administradores
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

// Componente para rotas públicas (impede usuário autenticado de acessar login/register)

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

    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.email === 'christian.zimpel@gmail.com';
    const isAdmin = isSuperAdmin || user?.role === 'ADMIN';

    if (target.startsWith('/admin') && !isAdmin) {
      target = '/varredura';
    }

    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rota Raiz (/) redireciona para /varredura */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/varredura" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/varredura"
        element={
          <ProtectedRoute>
            <ScraperPage />
          </ProtectedRoute>
        }
      />

      {/* Rotas Protegidas do AppFrame */}
      <Route
        path="/studio"
        element={
          <ProtectedRoute>
            <StudioPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/marcas-dagua"
        element={
          <ProtectedRoute>
            <WatermarksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/watermarks"
        element={
          <ProtectedRoute>
            <WatermarksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/historico"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />

      {/* Rotas Públicas de Autenticação */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        }
      />

      {/* Fluxos Especiais de Autenticação */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/2fa" element={<TwoFactorChallengePage />} />

      {/* Documentos Legais (Abertos e Públicos via Modal) */}
      <Route path="/terms" element={<LegalPage defaultDoc="terms" />} />
      <Route path="/termos" element={<LegalPage defaultDoc="terms" />} />
      <Route path="/privacy" element={<LegalPage defaultDoc="privacy" />} />
      <Route path="/privacidade" element={<LegalPage defaultDoc="privacy" />} />

      {/* Fallback para rotas desconhecidas */}
      <Route path="*" element={<Navigate to="/varredura" replace />} />
    </Routes>
  );
};
