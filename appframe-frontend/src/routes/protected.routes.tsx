import { Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './guards';
import {
  ScraperPage,
  StudioPage,
  WatermarksPage,
  HistoryPage,
  SettingsPage,
} from '../pages';

export const protectedRoutes = (
  <>
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
  </>
);
