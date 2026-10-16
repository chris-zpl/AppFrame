import React from 'react';
import { AppFrameLogo } from '../../../components/common/AppFrameLogo';

interface LoginHeaderProps {
  onLogoClick?: () => void;
  onNavigateRegister: () => void;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({
  onLogoClick,
  onNavigateRegister,
}) => {
  return (
    <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-10 pr-14 sm:pr-0">
      <AppFrameLogo size="sm" onClick={onLogoClick} />
      <button
        type="button"
        onClick={onNavigateRegister}
        className="font-title-sm text-title-sm text-neutral-600 dark:text-on-surface-variant hover:text-neutral-950 dark:hover:text-primary transition-colors cursor-pointer mr-0 sm:mr-16"
      >
        Não tem conta? <span className="font-semibold text-[#B8851B] dark:text-[#D4A346] underline">Cadastre-se</span>
      </button>
    </header>
  );
};
