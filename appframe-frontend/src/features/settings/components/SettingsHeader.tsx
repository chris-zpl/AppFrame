import React from 'react';

export const SettingsHeader: React.FC = () => {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
      <div className="flex flex-col">
        <div className="flex items-center gap-space-sm mb-1 flex-wrap">
          <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-neutral-900 dark:text-on-surface tracking-tight">
            Configurações e Segurança
          </h1>
        </div>
        <p className="font-body-md text-body-md text-neutral-600 dark:text-on-surface-variant max-w-2xl">
          Gerencie seus dados de acesso, credenciais Google, autenticação em duas etapas (2FA) e dispositivos conectados.
        </p>
      </div>
    </header>
  );
};
