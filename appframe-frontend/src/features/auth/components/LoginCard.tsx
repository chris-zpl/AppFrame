import React from 'react';
import { Card } from '../../../components/ui/Card';
import { AuthCardHeader } from './AuthCardHeader';
import { SocialLoginDivider } from './SocialLoginDivider';
import { LoginForm } from './LoginForm';

interface LoginCardProps {
  children?: React.ReactNode;
  email?: string;
  password?: string;
  showPassword?: boolean;
  rememberMe?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  onEmailChange?: (val: string) => void;
  onPasswordChange?: (val: string) => void;
  onToggleShowPassword?: () => void;
  onRememberMeChange?: (val: boolean) => void;
  onOpenForgotPassword?: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  onGoogleLogin: () => void;
  onNavigateRegister: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  children,
  email = '',
  password = '',
  showPassword = false,
  rememberMe = false,
  isLoading = false,
  errorMessage = null,
  onEmailChange = () => {},
  onPasswordChange = () => {},
  onToggleShowPassword = () => {},
  onRememberMeChange = () => {},
  onOpenForgotPassword = () => {},
  onSubmit = () => {},
  onGoogleLogin,
  onNavigateRegister,
}) => {
  return (
    <Card
      variant="auth"
      className="w-full p-6 md:p-space-lg relative overflow-hidden transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-surface-container-high/80"
    >
      {/* Cabeçalho do Card */}
      <AuthCardHeader
        title="Entrar no AppFrame"
        subtitle="Acesse o painel executivo de edição e inteligência de vídeo"
      />

      {/* Botão Google + Divisor */}
      <SocialLoginDivider
        buttonText="Entrar com o Google"
        dividerText="OU ENTRE COM SEU E-MAIL"
        onGoogleClick={onGoogleLogin}
        disabled={isLoading}
      />

      {/* Mensagem de Erro */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-error-container/30 border border-red-200 dark:border-error/40 text-red-800 dark:text-[#ffdad6] text-body-sm font-body-sm flex items-start gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-red-600 dark:text-error">
            error
          </span>
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Formulário de Login */}
      {children ? (
        children
      ) : (
        <LoginForm
          email={email}
          password={password}
          showPassword={showPassword}
          rememberMe={rememberMe}
          isLoading={isLoading}
          onEmailChange={onEmailChange}
          onPasswordChange={onPasswordChange}
          onToggleShowPassword={onToggleShowPassword}
          onRememberMeChange={onRememberMeChange}
          onOpenForgotPassword={onOpenForgotPassword}
          onSubmit={onSubmit}
        />
      )}

      {/* Rodapé Alternativo (Cadastro) */}
      <div className="mt-space-lg flex flex-col items-center gap-space-md text-center">
        <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF]">
          Ainda não tem conta no AppFrame?{' '}
          <button
            type="button"
            onClick={onNavigateRegister}
            className="text-[#B8851B] dark:text-[#D4A346] hover:underline font-semibold ml-1 cursor-pointer"
          >
            Cadastre-se
          </button>
        </p>
      </div>
    </Card>
  );
};
