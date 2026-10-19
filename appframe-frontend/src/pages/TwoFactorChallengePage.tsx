import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigation } from '../contexts/NavigationContext';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
  useTwoFactorChallenge,
  TwoFactorHeader,
  TwoFactorChallengeCard,
} from '../features/auth';

export const TwoFactorChallengePage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const tempToken = params.tempToken || '';

  const {
    digits,
    isBackupMode,
    toggleMode,
    backupCode,
    setBackupCode,
    isLoading,
    errorMessage,
    inputRefs,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
    isComplete,
    submitChallenge,
  } = useTwoFactorChallenge({ tempToken });

  // Se acessar a página diretamente sem tempToken, redireciona ao login com aviso
  useEffect(() => {
    if (!tempToken) {
      toast.error('Sessão de verificação expirada ou ausente. Por favor, faça login novamente.');
      navigate('login', { replace: true });
    }
  }, [tempToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitChallenge(tempToken);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f9fd] dark:bg-surface text-neutral-900 dark:text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos Decorativos */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[340px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute -bottom-20 -right-16 w-72 h-72 bg-secondary-container/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Header com Logo e Ação de Voltar */}
      <TwoFactorHeader
        onLogoClick={() => navigate('scraper')}
        onBackToLogin={() => navigate('login')}
      />

      {/* Card Central com os Inputs do Desafio */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 z-10 w-full">
        <div className="relative flex flex-col items-center justify-center w-full max-w-[440px] mx-auto">
          <TwoFactorChallengeCard
            isBackupMode={isBackupMode}
            digits={digits}
            backupCode={backupCode}
            inputRefs={inputRefs}
            isLoading={isLoading}
            isComplete={isComplete}
            errorMessage={errorMessage}
            onDigitChange={handleDigitChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBackupCodeChange={setBackupCode}
            onSubmit={handleSubmit}
            onToggleMode={toggleMode}
            onCancel={() => navigate('login')}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-2 text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF] z-10">
        AppFrame © 2026 • Executive Video Intelligence
      </footer>
    </div>
  );
};
