import React from 'react';
import { AppFrameLogo } from '../../../components/common/AppFrameLogo';

interface RegisterHeaderProps {
  onLogoClick?: () => void;
}

export const RegisterHeader: React.FC<RegisterHeaderProps> = ({
  onLogoClick,
}) => {
  return (
    <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-10 pr-14 sm:pr-0">
      <AppFrameLogo size="sm" onClick={onLogoClick} />
    </header>
  );
};
