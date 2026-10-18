import React from 'react';
import { Input, Button, VisibilityToggle } from '../../../components/ui';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import type { PasswordStrengthResult } from '../utils/password.utils';

interface ResetPasswordFormProps {
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

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
          <span className="material-symbols-outlined text-[26px]">
            lock_reset
          </span>
        </div>
        <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
          Redefinir Senha
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Crie uma nova senha segura para acessar sua conta.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl text-error text-body-sm flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
            error
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Input
            label="Nova Senha"
            placeholder="Mínimo de 8 caracteres"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            required
            disabled={isLoading}
            minLength={8}
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                lock
              </span>
            }
            rightElement={
              <VisibilityToggle
                isVisible={showPassword}
                onToggle={onToggleShowPassword}
                ariaLabel="Mostrar ou ocultar senha"
              />
            }
          />

          {/* Indicador Visual Dinâmico de Força de Senha */}
          <PasswordStrengthIndicator passwordStrength={passwordStrength} />
        </div>

        <Input
          label="Confirmar Nova Senha"
          placeholder="Repita a nova senha"
          type={showConfirmPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          required
          disabled={isLoading}
          minLength={8}
          leftIcon={
            <span className="material-symbols-outlined text-[18px]">
              lock_clock
            </span>
          }
          rightElement={
            <VisibilityToggle
              isVisible={showConfirmPassword}
              onToggle={onToggleShowConfirmPassword}
              ariaLabel="Mostrar ou ocultar confirmação de senha"
            />
          }
        />
      </div>

      <div className="pt-2">
        <Button
          variant="primary"
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Redefinindo senha...' : 'Salvar Nova Senha'}
        </Button>
      </div>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onNavigateLogin}
          className="text-body-sm font-medium text-neutral-600 dark:text-[#949DAF] hover:underline cursor-pointer"
        >
          Voltar ao login
        </button>
      </div>
    </form>
  );
};
