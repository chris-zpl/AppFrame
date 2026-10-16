import React from 'react';
import { Card } from '../../../components/ui/Card';
import { ResetPasswordSuccess } from './ResetPasswordSuccess';
import { ResetPasswordInvalidToken } from './ResetPasswordInvalidToken';
import { ResetPasswordForm } from './ResetPasswordForm';
import type { PasswordStrengthResult } from '../utils/password.utils';

interface ResetPasswordCardProps {
  token: string;
  isSuccess: boolean;
  newPassword: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  passwordStrength: PasswordStrengthResult;
  onNewPasswordChange: (val: string) => void;
  onConfirmPasswordChange: (val: string) => void;
  onToggleShowPassword: () => void;
  onToggleShowConfirmPassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onNavigateLogin: () => void;
}

export const ResetPasswordCard: React.FC<ResetPasswordCardProps> = ({
  token,
  isSuccess,
  newPassword,
  confirmPassword,
  showPassword,
  showConfirmPassword,
  isLoading,
  errorMessage,
  passwordStrength,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleShowPassword,
  onToggleShowConfirmPassword,
  onSubmit,
  onNavigateLogin,
}) => {
  return (
    <Card variant="auth" className="w-full p-6 md:p-8">
      {isSuccess ? (
        <ResetPasswordSuccess onNavigateLogin={onNavigateLogin} />
      ) : !token ? (
        <ResetPasswordInvalidToken onNavigateLogin={onNavigateLogin} />
      ) : (
        <ResetPasswordForm
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          showPassword={showPassword}
          showConfirmPassword={showConfirmPassword}
          isLoading={isLoading}
          errorMessage={errorMessage}
          passwordStrength={passwordStrength}
          onNewPasswordChange={onNewPasswordChange}
          onConfirmPasswordChange={onConfirmPasswordChange}
          onToggleShowPassword={onToggleShowPassword}
          onToggleShowConfirmPassword={onToggleShowConfirmPassword}
          onSubmit={onSubmit}
          onNavigateLogin={onNavigateLogin}
        />
      )}
    </Card>
  );
};
