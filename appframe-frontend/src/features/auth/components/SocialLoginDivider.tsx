import React from 'react';
import { Button } from '../../../components/ui/Button';

interface SocialLoginDividerProps {
  onGoogleClick: () => void;
  buttonText: string;
  dividerText: string;
  disabled?: boolean;
}

export const SocialLoginDivider: React.FC<SocialLoginDividerProps> = ({
  onGoogleClick,
  buttonText,
  dividerText,
  disabled = false,
}) => {
  return (
    <div className="mt-space-lg flex flex-col gap-space-md">
      <Button
        variant="google"
        onClick={onGoogleClick}
        type="button"
        disabled={disabled}
      >
        {buttonText}
      </Button>

      <div className="relative flex items-center justify-center my-1">
        <div className="w-full h-px bg-neutral-200 dark:bg-surface-container-highest" />
        <span className="absolute bg-white dark:bg-surface-container-low px-3 font-label-sm text-label-sm tracking-widest uppercase text-neutral-500 dark:text-[#949DAF] font-medium">
          {dividerText}
        </span>
      </div>
    </div>
  );
};
