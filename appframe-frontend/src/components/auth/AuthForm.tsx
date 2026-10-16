import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { AppFrameLogo } from '../common/AppFrameLogo';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';

export interface AuthFormProps {
  initialMode?: 'register' | 'login';
  onGoogleAuth?: () => void;
  onSubmitSuccess?: (data: any) => void;
  className?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({
  initialMode = 'register',
  onGoogleAuth,
  onSubmitSuccess,
  className,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Exemplo$2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (onSubmitSuccess) {
        onSubmitSuccess({ name, email, mode });
      }
    }, 800);
  };

  return (
    <div className={cn('relative flex flex-col items-center justify-center w-full max-w-[440px] mx-auto', className)}>
      {/* Halos Luminosos Ambientais no Fundo */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] md:w-[620px] h-[300px] md:h-[340px] bg-primary/10 rounded-full blur-[110px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -right-16 w-64 md:w-80 h-64 md:h-80 bg-secondary-container/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      <Card
        variant="auth"
        className="w-full p-6 md:p-space-lg relative overflow-hidden transition-all duration-300"
      >
        {/* Cabeçalho do Card */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-space-sm">
            <AppFrameLogo size="xl" showText={false} glow />
          </div>

          <div className="flex items-center gap-1 font-headline-md text-headline-md tracking-tight mb-space-xs">
            <span className="text-on-surface font-bold">App</span>
            <span className="text-primary font-bold">Frame</span>
          </div>

          <h1 className="font-title-md text-title-md text-on-surface font-semibold tracking-normal">
            {isRegister ? 'Criar Conta no AppFrame' : 'Entrar no AppFrame'}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-[320px]">
            Automação, cortes dinâmicos e legendas inteligentes
          </p>
        </div>

        {/* Botão Google + Divisor */}
        <div className="mt-space-lg flex flex-col gap-space-md">
          <Button
            variant="google"
            onClick={onGoogleAuth}
            type="button"
          >
            {isRegister ? 'Cadastrar com o Google' : 'Entrar com o Google'}
          </Button>

          <div className="relative flex items-center justify-center my-1">
            <div className="w-full h-px bg-surface-container-highest" />
            <span className="absolute bg-surface-container-low px-3 font-label-sm text-label-sm tracking-widest uppercase text-on-surface-variant font-medium">
              {isRegister ? 'OU CADASTRE COM SEU E-MAIL' : 'OU ENTRE COM SEU E-MAIL'}
            </span>
          </div>

          {/* Formulário */}
          <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
            {isRegister && (
              <Input
                label="Nome Completo"
                placeholder="Seu nome e sobrenome"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                leftIcon={
                  <span className="material-symbols-outlined text-[18px]">
                    person
                  </span>
                }
              />
            )}

            <Input
              label={isRegister ? 'E-mail Profissional' : 'Seu E-mail'}
              placeholder="nome@empresa.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  mail
                </span>
              }
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Senha de Acesso"
                placeholder="••••••••••••"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={
                  <span className="material-symbols-outlined text-[18px]">
                    lock
                  </span>
                }
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Mostrar ou ocultar senha"
                    className="p-1 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                }
              />

              {isRegister && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="h-1 rounded-full bg-primary transition-all" />
                    <div className="h-1 rounded-full bg-primary transition-all" />
                    <div className="h-1 rounded-full bg-primary transition-all" />
                    <div className="h-1 rounded-full bg-surface-container-highest transition-all" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[14px] text-primary">
                        verified_user
                      </span>
                      <span className="font-label-sm text-label-sm">
                        Mínimo de 8 caracteres, números e símbolos
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary font-semibold">
                      Forte
                    </span>
                  </div>
                </div>
              )}
            </div>

            {isRegister && (
              <div className="mt-1">
                <Checkbox
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  label={
                    <span>
                      Li e concordo com os{' '}
                      <a href="#" className="text-primary hover:underline font-semibold">
                        Termos de Serviço
                      </a>{' '}
                      e a{' '}
                      <a href="#" className="text-primary hover:underline font-semibold">
                        Política de Privacidade
                      </a>{' '}
                      do AppFrame.
                    </span>
                  }
                />
              </div>
            )}

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
              <span>{isRegister ? 'Criar Minha Conta' : 'Acessar Conta'}</span>
            </Button>
          </form>
        </div>

        {/* Rodapé Alternativo (Login / Cadastro) */}
        <div className="mt-space-lg flex flex-col items-center gap-space-md text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {isRegister ? 'Já é cadastrado no AppFrame?' : 'Ainda não tem conta no AppFrame?'}
            <button
              type="button"
              onClick={() => setMode(isRegister ? 'login' : 'register')}
              className="text-primary hover:underline font-semibold ml-1.5 cursor-pointer"
            >
              {isRegister ? 'Entrar' : 'Cadastre-se'}
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};
