import React from 'react';
import { AppFrameLogo } from '../../../components/common/AppFrameLogo';

interface LoginHeaderProps {
  onLogoClick?: () => void;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({
  onLogoClick,
}) => {
  return (
    <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-10 pr-14 sm:pr-0">
      <AppFrameLogo size="sm" onClick={onLogoClick} />
    </header>
  );
};
