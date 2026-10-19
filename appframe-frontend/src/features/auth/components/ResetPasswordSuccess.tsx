import React from 'react';
import { Button } from '../../../components/ui/Button';

interface ResetPasswordSuccessProps {
  onNavigateLogin: () => void;
}

export const ResetPasswordSuccess: React.FC<ResetPasswordSuccessProps> = ({
  onNavigateLogin,
}) => {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-4 animate-in fade-in">
      <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
        <span className="material-symbols-outlined text-[32px]">
          check_circle
        </span>
      </div>
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-neutral-900 dark:text-on-surface mb-2">
          Senha Alterada!
        </h2>
        <p className="font-body-md text-body-md text-neutral-600 dark:text-on-surface-variant max-w-sm">
          Sua senha foi redefinida com sucesso. Todas as sessões anteriores foram desconectadas por segurança.
        </p>
      </div>
      <Button
        variant="primary"
        className="mt-4 w-full"
        onClick={onNavigateLogin}
      >
        Ir para o Login
      </Button>
    </div>
  );
};
