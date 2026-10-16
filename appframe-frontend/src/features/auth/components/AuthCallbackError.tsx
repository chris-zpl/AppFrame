import React from 'react';
import { Button } from '../../../components/ui/Button';

export interface AuthCallbackErrorProps {
  error: string;
  onBackToLogin: () => void;
}

export const AuthCallbackError: React.FC<AuthCallbackErrorProps> = ({
  error,
  onBackToLogin,
}) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-14 h-14 rounded-full bg-error-container/40 border border-error/40 text-error flex items-center justify-center">
        <span className="material-symbols-outlined text-[32px]">warning</span>
      </div>
      <h2 className="font-title-md text-title-md font-bold text-neutral-900 dark:text-[#F8F9FA]">
        Falha na Autenticação
      </h2>
      <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF] max-w-xs">
        {error}
      </p>
      <Button
        variant="primary"
        onClick={onBackToLogin}
        className="mt-2 w-full"
      >
        Voltar para o Login
      </Button>
    </div>
  );
};
