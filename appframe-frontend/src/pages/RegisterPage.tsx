import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import {
  useGuestGuard,
  useRegisterForm,
  RegisterHeader,
  RegisterCard,
  RegisterForm,
  AuthFooter,
} from '../features/auth';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LegalModal, useLegalModal } from '../features/legal';

export const RegisterPage: React.FC = () => {
  const { navigate } = useNavigation();
  const {
    isOpen: legalModalOpen,
    activeDoc: legalModalDoc,
    openTerms: handleOpenTerms,
    openPrivacy: handleOpenPrivacy,
    close: handleCloseLegal,
  } = useLegalModal();

  useGuestGuard();

  const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    agreeTerms,
    setAgreeTerms,
    isLoading,
    errorMessage,
    setErrorMessage,
    passwordStrength,
    handleGoogleSignup,
    handleRegisterSubmit,
  } = useRegisterForm();

  return (
    <div className="min-h-screen w-full bg-[#f8f9fd] dark:bg-surface text-neutral-900 dark:text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden antialiased selection:bg-primary/20 selection:text-primary">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos Ambientais no Fundo */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] md:w-[680px] h-[300px] md:h-[360px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -right-16 w-64 md:w-80 h-64 md:h-80 bg-secondary-container/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Top Header com Logo e Ação */}
      <RegisterHeader
        onLogoClick={() => navigate('scraper')}
        onNavigateLogin={() => navigate('login')}
      />

      {/* Conteúdo Central */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 z-10 w-full">
        <div className="relative flex flex-col items-center justify-center w-full max-w-[440px] mx-auto">
          <RegisterCard
            isLoading={isLoading}
            errorMessage={errorMessage}
            onGoogleSignup={handleGoogleSignup}
            onNavigateLogin={() => navigate('login')}
          >
            <RegisterForm
              name={name}
              email={email}
              password={password}
              showPassword={showPassword}
              agreeTerms={agreeTerms}
              isLoading={isLoading}
              passwordStrength={passwordStrength}
              onNameChange={(val) => {
                setName(val);
                if (errorMessage) setErrorMessage(null);
              }}
              onEmailChange={(val) => {
                setEmail(val);
                if (errorMessage) setErrorMessage(null);
              }}
              onPasswordChange={(val) => {
                setPassword(val);
                if (errorMessage) setErrorMessage(null);
              }}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
              onAgreeTermsChange={setAgreeTerms}
              onSubmit={handleRegisterSubmit}
              onOpenTerms={handleOpenTerms}
              onOpenPrivacy={handleOpenPrivacy}
            />
          </RegisterCard>
        </div>
      </main>

      {/* Footer com Links Legais e Modal Integrado */}
      <AuthFooter />

      {/* Modal de Documentos Legais (disparado pelo link no checkbox) */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={handleCloseLegal}
        initialDoc={legalModalDoc}
      />
    </div>
  );
};
