import React from 'react';
import { AppFrameLogo } from '../../../components/common/AppFrameLogo';

interface RegisterHeaderProps {
  onLogoClick?: () => void;
  onNavigateLogin: () => void;
}

export const RegisterHeader: React.FC<RegisterHeaderProps> = ({
  onLogoClick,
  onNavigateLogin,
}) => {
  return (
    <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-10 pr-14 sm:pr-0">
      <AppFrameLogo size="sm" onClick={onLogoClick} />
      <button
        type="button"
        onClick={onNavigateLogin}
        className="font-title-sm text-title-sm text-neutral-600 dark:text-on-surface-variant hover:text-neutral-950 dark:hover:text-primary transition-colors cursor-pointer mr-0 sm:mr-16"
      >
        Já tem conta? <span className="font-semibold text-[#B8851B] dark:text-[#D4A346] underline">Entrar</span>
      </button>
    </header>
  );
};
