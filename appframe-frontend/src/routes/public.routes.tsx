import { Route } from 'react-router-dom';
import { PublicRoute } from './guards';
import {
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  AuthCallbackPage,
  TwoFactorChallengePage,
  LegalPage,
} from '../pages';

export const publicRoutes = (
  <>
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
    <Route
      path="/2fa"
      element={
        <PublicRoute>
          <TwoFactorChallengePage />
        </PublicRoute>
      }
    />

    {/* Documentos Legais Públicos */}
    <Route path="/terms" element={<LegalPage defaultDoc="terms" />} />
    <Route path="/termos" element={<LegalPage defaultDoc="terms" />} />
    <Route path="/privacy" element={<LegalPage defaultDoc="privacy" />} />
    <Route path="/privacidade" element={<LegalPage defaultDoc="privacy" />} />
  </>
);
