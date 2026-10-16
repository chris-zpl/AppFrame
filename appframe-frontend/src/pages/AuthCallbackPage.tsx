import React from 'react';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useAuthCallback, AuthCallbackCard } from '../features/auth';

export const AuthCallbackPage: React.FC = () => {
  const { statusText, error, progress, handleBackToLogin } = useAuthCallback();

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos Ambientais */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-secondary-container/20 rounded-full blur-[100px] pointer-events-none" />

      <AuthCallbackCard
        statusText={statusText}
        progress={progress}
        error={error}
        onBackToLogin={handleBackToLogin}
      />
    </div>
  );
};
