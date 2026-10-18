import React from 'react';
import { Card } from '../../../components/ui/Card';
import { AuthCardHeader } from './AuthCardHeader';
import { SocialLoginDivider } from './SocialLoginDivider';
import { RegisterForm } from './RegisterForm';
import type { PasswordStrengthResult } from '../utils/password.utils';

interface RegisterCardProps {
  children?: React.ReactNode;
  name?: string;
  email?: string;
  password?: string;
  showPassword?: boolean;
  agreeTerms?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  passwordStrength?: PasswordStrengthResult;
  onNameChange?: (val: string) => void;
  onEmailChange?: (val: string) => void;
  onPasswordChange?: (val: string) => void;
  onToggleShowPassword?: () => void;
  onAgreeTermsChange?: (val: boolean) => void;
  onSubmit?: (e: React.FormEvent) => void;
  onGoogleSignup: () => void;
  onNavigateLogin: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
}

export const RegisterCard: React.FC<RegisterCardProps> = ({
  children,
  name = '',
  email = '',
  password = '',
  showPassword = false,
  agreeTerms = false,
  isLoading = false,
  errorMessage = null,
  passwordStrength = { score: 0, label: 'Vazia', colorClass: 'bg-surface-container-highest', isStrong: false },
  onNameChange = () => {},
  onEmailChange = () => {},
  onPasswordChange = () => {},
  onToggleShowPassword = () => {},
  onAgreeTermsChange = () => {},
  onSubmit = () => {},
  onGoogleSignup,
  onNavigateLogin,
  onOpenTerms = () => {},
  onOpenPrivacy = () => {},
}) => {
  return (
    <Card
      variant="auth"
      className="w-full p-6 md:p-space-lg relative overflow-hidden transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-surface-container-high/80"
    >
      {/* Cabeçalho do Card */}
      <AuthCardHeader
        title="Criar Conta no AppFrame"
        subtitle="Automação, cortes dinâmicos e legendas inteligentes"
      />

      {/* Botão Google + Divisor */}
      <SocialLoginDivider
        buttonText="Cadastrar com o Google"
        dividerText="OU CADASTRE COM SEU E-MAIL"
        onGoogleClick={onGoogleSignup}
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

      {/* Formulário de Registro */}
      {children ? (
        children
      ) : (
        <RegisterForm
          name={name}
          email={email}
          password={password}
          showPassword={showPassword}
          agreeTerms={agreeTerms}
          isLoading={isLoading}
          passwordStrength={passwordStrength}
          onNameChange={onNameChange}
          onEmailChange={onEmailChange}
          onPasswordChange={onPasswordChange}
          onToggleShowPassword={onToggleShowPassword}
          onAgreeTermsChange={onAgreeTermsChange}
          onSubmit={onSubmit}
          onOpenTerms={onOpenTerms}
          onOpenPrivacy={onOpenPrivacy}
        />
      )}

      {/* Rodapé Alternativo (Login) */}
      <div className="mt-space-lg flex flex-col items-center gap-space-md text-center">
        <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF]">
          Já é cadastrado no AppFrame?{' '}
          <button
            type="button"
            onClick={onNavigateLogin}
            className="text-[#B8851B] dark:text-[#D4A346] hover:underline font-semibold ml-1 cursor-pointer"
          >
            Entrar
          </button>
        </p>
      </div>
    </Card>
  );
};
