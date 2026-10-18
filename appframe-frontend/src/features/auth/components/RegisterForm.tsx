import React from 'react';
import { Input, Button, Checkbox, VisibilityToggle } from '../../../components/ui';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import type { PasswordStrengthResult } from '../utils/password.utils';

interface RegisterFormProps {
  name: string;
  email: string;
  password: string;
  showPassword: boolean;
  agreeTerms: boolean;
  isLoading: boolean;
  passwordStrength: PasswordStrengthResult;
  onNameChange: (val: string) => void;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onToggleShowPassword: () => void;
  onAgreeTermsChange: (val: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  name,
  email,
  password,
  showPassword,
  agreeTerms,
  isLoading,
  passwordStrength,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onToggleShowPassword,
  onAgreeTermsChange,
  onSubmit,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  return (
    <form className="flex flex-col gap-3.5 mt-space-md" onSubmit={onSubmit}>
      <Input
        label="Nome Completo"
        placeholder="Seu nome e sobrenome"
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        required
        disabled={isLoading}
        leftIcon={
          <span className="material-symbols-outlined text-[18px]">
            person
          </span>
        }
      />

      <Input
        label="E-mail Profissional"
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
          label="Senha de Acesso"
          placeholder="Mínimo de 8 caracteres"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
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

      <div className="mt-1">
        <Checkbox
          checked={agreeTerms}
          onChange={(e) => onAgreeTermsChange(e.target.checked)}
          disabled={isLoading}
          label={
            <span>
              Li e concordo com os{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenTerms();
                }}
                className="text-[#B8851B] dark:text-[#D4A346] hover:underline font-semibold cursor-pointer inline"
              >
                Termos de Serviço
              </button>{' '}
              e a{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenPrivacy();
                }}
                className="text-[#B8851B] dark:text-[#D4A346] hover:underline font-semibold cursor-pointer inline"
              >
                Política de Privacidade
              </button>{' '}
              do AppFrame.
            </span>
          }
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        disabled={!agreeTerms}
        className="mt-2 w-full"
        rightIcon={
          <span className="material-symbols-outlined text-[18px]">
            arrow_forward
          </span>
        }
      >
        Criar Minha Conta
      </Button>
    </form>
  );
};
