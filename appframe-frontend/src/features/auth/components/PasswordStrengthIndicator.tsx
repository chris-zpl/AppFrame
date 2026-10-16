import React from 'react';
import type { PasswordStrengthResult } from '../utils/password.utils';

interface PasswordStrengthIndicatorProps {
  passwordStrength: PasswordStrengthResult;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  passwordStrength,
}) => {
  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="grid grid-cols-4 gap-1.5">
        <div
          className={`h-1 rounded-full transition-all duration-300 ${
            passwordStrength.score >= 1 ? passwordStrength.colorClass : 'bg-surface-container-highest'
          }`}
        />
        <div
          className={`h-1 rounded-full transition-all duration-300 ${
            passwordStrength.score >= 2 ? passwordStrength.colorClass : 'bg-surface-container-highest'
          }`}
        />
        <div
          className={`h-1 rounded-full transition-all duration-300 ${
            passwordStrength.score >= 3 ? passwordStrength.colorClass : 'bg-surface-container-highest'
          }`}
        />
        <div
          className={`h-1 rounded-full transition-all duration-300 ${
            passwordStrength.score >= 4 ? passwordStrength.colorClass : 'bg-surface-container-highest'
          }`}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-neutral-600 dark:text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px] text-primary">
            verified_user
          </span>
          <span className="font-label-sm text-label-sm">
            Mínimo de 8 caracteres, números e símbolos
          </span>
        </div>
        <span
          className={`font-label-sm text-label-sm font-semibold transition-colors ${
            passwordStrength.score >= 3 ? 'text-[#B8851B] dark:text-primary' : 'text-neutral-600 dark:text-on-surface-variant'
          }`}
        >
          {passwordStrength.label}
        </span>
      </div>
    </div>
  );
};
