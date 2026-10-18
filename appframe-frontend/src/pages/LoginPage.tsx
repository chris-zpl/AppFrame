import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import {
  useGuestGuard,
  useLoginForm,
  LoginHeader,
  LoginCard,
  LoginForm,
  ForgotPasswordModal,
  AuthFooter,
} from '../features/auth';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const LoginPage: React.FC = () => {
  const { navigate, params } = useNavigation();

  useGuestGuard();

  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    errorMessage,
    setErrorMessage,
    showForgotModal,
    setShowForgotModal,
    handleGoogleLogin,
    handleLoginSubmit,
  } = useLoginForm({ initialEmail: params.email });

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden antialiased selection:bg-primary/20 selection:text-primary">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos Ambientais no Fundo */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] md:w-[680px] h-[300px] md:h-[360px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -right-16 w-64 md:w-80 h-64 md:h-80 bg-secondary-container/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Top Header com Logo e Ação */}
      <LoginHeader
        onLogoClick={() => navigate('scraper')}
        onNavigateRegister={() => navigate('register')}
      />

      {/* Conteúdo Central */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 z-10 w-full">
        <div className="relative flex flex-col items-center justify-center w-full max-w-[440px] mx-auto">
          <LoginCard
            isLoading={isLoading}
            errorMessage={errorMessage}
            onGoogleLogin={handleGoogleLogin}
            onNavigateRegister={() => navigate('register')}
          >
            <LoginForm
              email={email}
              password={password}
              showPassword={showPassword}
              rememberMe={rememberMe}
              isLoading={isLoading}
              onEmailChange={(val) => {
                setEmail(val);
                if (errorMessage) setErrorMessage(null);
              }}
              onPasswordChange={(val) => {
                setPassword(val);
                if (errorMessage) setErrorMessage(null);
              }}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
              onRememberMeChange={setRememberMe}
              onOpenForgotPassword={() => setShowForgotModal(true)}
              onSubmit={handleLoginSubmit}
            />
          </LoginCard>
        </div>
      </main>

      {/* Modal de Recuperação de Senha */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
      />

      {/* Footer com Links Legais e Modal Integrado */}
      <AuthFooter />
    </div>
  );
};
