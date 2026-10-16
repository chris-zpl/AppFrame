import React from 'react';
import { AppFrameLogo } from '../../../components/common/AppFrameLogo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';

interface ResetPasswordHeaderProps {
  onLogoClick?: () => void;
}

export const ResetPasswordHeader: React.FC<ResetPasswordHeaderProps> = ({
  onLogoClick,
}) => {
  return (
    <header className="w-full flex items-center justify-between px-space-md py-4 md:px-space-xl z-10">
      <div
        className="flex items-center gap-space-sm cursor-pointer"
        onClick={onLogoClick}
      >
        <AppFrameLogo className="w-8 h-8" />
        <span className="font-title-lg text-title-lg font-bold tracking-tight text-on-surface">
          AppFrame
        </span>
      </div>
      <ThemeToggle />
    </header>
  );
};
