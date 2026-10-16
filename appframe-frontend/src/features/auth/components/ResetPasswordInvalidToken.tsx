import React from 'react';
import { Button } from '../../../components/ui/Button';

interface ResetPasswordInvalidTokenProps {
  onNavigateLogin: () => void;
}

export const ResetPasswordInvalidToken: React.FC<ResetPasswordInvalidTokenProps> = ({
  onNavigateLogin,
}) => {
  return (
    <div className="flex flex-col items-center text-center gap-4 py-4 animate-in fade-in">
      <div className="w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center border border-error/20">
        <span className="material-symbols-outlined text-[32px]">
          link_off
        </span>
      </div>
      <div>
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
          Link Inválido
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
          Nenhum código de redefinição foi identificado na URL. Solicite uma nova recuperação na tela de login.
        </p>
      </div>
      <Button
        variant="primary"
        className="mt-4 w-full"
        onClick={onNavigateLogin}
      >
        Voltar ao Login
      </Button>
    </div>
  );
};
