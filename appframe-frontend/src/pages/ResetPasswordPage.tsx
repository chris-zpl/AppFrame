import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  useResetPasswordForm,
  ResetPasswordHeader,
  ResetPasswordCard,
  AuthFooter,
} from '../features/auth';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isLoading,
    errorMessage,
    setErrorMessage,
    isSuccess,
    passwordStrength,
    handleResetSubmit,
  } = useResetPasswordForm({ token });

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#f8f9fd] dark:bg-surface text-neutral-900 dark:text-on-surface overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Background Decorativo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[140px]" />
      </div>

      {/* Header com Logo e ThemeToggle */}
      <ResetPasswordHeader onLogoClick={() => navigate('/login')} />

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-[460px]">
          <ResetPasswordCard
            token={token}
            isSuccess={isSuccess}
            newPassword={newPassword}
            confirmPassword={confirmPassword}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            isLoading={isLoading}
            errorMessage={errorMessage}
            passwordStrength={passwordStrength}
            onNewPasswordChange={(val) => {
              setNewPassword(val);
              if (errorMessage) setErrorMessage(null);
            }}
            onConfirmPasswordChange={(val) => {
              setConfirmPassword(val);
              if (errorMessage) setErrorMessage(null);
            }}
            onToggleShowPassword={() => setShowPassword(!showPassword)}
            onToggleShowConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
            onSubmit={handleResetSubmit}
            onNavigateLogin={() => navigate('/login')}
          />
        </div>
      </main>

      {/* Rodapé Institucional */}
      <AuthFooter showLegalLinks={false} />
    </div>
  );
};
