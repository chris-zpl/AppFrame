import React from 'react';

export interface AuthCallbackProgressProps {
  statusText: string;
  progress: number;
}

export const AuthCallbackProgress: React.FC<AuthCallbackProgressProps> = ({
  statusText,
  progress,
}) => {
  return (
    <div className="flex flex-col items-center w-full gap-4">
      {/* Loader Âmbar Estilizado */}
      <div className="relative w-20 h-20 flex items-center justify-center my-2">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(242,190,94,0.3)] animate-pulse">
          <span className="material-symbols-outlined text-[24px]">lock_open</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <h2 className="font-headline-sm text-headline-sm font-bold text-neutral-900 dark:text-[#F8F9FA]">
          Autenticando Conta Google
        </h2>
        <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF]">
          {statusText}
        </p>
      </div>

      {/* Barra de Progresso Âmbar */}
      <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-3">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="font-label-sm text-label-sm text-neutral-500 dark:text-[#949DAF] mt-1">
        Aguarde a validação do token OAuth 2.0...
      </span>
    </div>
  );
};
