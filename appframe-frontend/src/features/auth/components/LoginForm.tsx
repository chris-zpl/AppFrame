import React from 'react';
import { Input, Button, Checkbox, VisibilityToggle } from '../../../components/ui';

interface LoginFormProps {
  email: string;
  password: string;
  showPassword: boolean;
  rememberMe: boolean;
  isLoading: boolean;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onToggleShowPassword: () => void;
  onRememberMeChange: (val: boolean) => void;
  onOpenForgotPassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  email,
  password,
  showPassword,
  rememberMe,
  isLoading,
  onEmailChange,
  onPasswordChange,
  onToggleShowPassword,
  onRememberMeChange,
  onOpenForgotPassword,
  onSubmit,
}) => {
  return (
    <form className="flex flex-col gap-3.5 mt-space-md" onSubmit={onSubmit}>
      <Input
        id="login-email"
        name="email"
        autoComplete="email"
        label="Seu E-mail"
        placeholder="nome@empresa.com"
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        required
        disabled={isLoading}
        leftIcon={
          <span className="material-symbols-outlined text-[18px]">
            mail
          </span>
        }
      />

      <div className="flex flex-col gap-1.5">
        <Input
          id="login-password"
          name="password"
          autoComplete="current-password"
          label="Senha de Acesso"
          placeholder="••••••••••••"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          disabled={isLoading}
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

        {/* Linha Auxiliar: Lembrar dispositivo e Recuperação de Senha */}
        <div className="flex items-center justify-between mt-1">
          <Checkbox
            checked={rememberMe}
            onChange={(e) => onRememberMeChange(e.target.checked)}
            disabled={isLoading}
            label="Lembrar de mim"
          />

          <button
            type="button"
            onClick={onOpenForgotPassword}
            className="text-label-sm font-label-sm text-[#B8851B] dark:text-[#D4A346] hover:underline font-medium cursor-pointer"
          >
            Esqueceu a senha?
          </button>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="mt-2 w-full"
        rightIcon={
          <span className="material-symbols-outlined text-[18px]">
            arrow_forward
          </span>
        }
      >
        Acessar Conta
      </Button>
    </form>
  );
};
