import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
} from '../pages';

// Componente para proteção de rotas privadas
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-on-surface-variant text-sm font-medium">Validando sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Componente para rotas públicas (impede usuário autenticado de acessar login/register)
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-surface flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/varredura" replace />;
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

      {/* Fluxos Especiais de Autenticação */}
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/2fa" element={<TwoFactorChallengePage />} />

      {/* Fallback para rotas desconhecidas */}
      <Route path="*" element={<Navigate to="/varredura" replace />} />
    </Routes>
  );
};
