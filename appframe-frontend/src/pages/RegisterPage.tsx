import React, { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import {
  useGuestGuard,
  useRegisterForm,
  AuthCardHeader,
  SocialLoginDivider,
  PasswordStrengthIndicator,
  AuthFooter,
} from '../features/auth';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { LegalModal } from '../components/legal';

export const RegisterPage: React.FC = () => {
  const { navigate } = useNavigation();
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalDoc, setLegalModalDoc] = useState<'terms' | 'privacy'>('terms');

  useGuestGuard();

  const {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    agreeTerms,
    setAgreeTerms,
    isLoading,
    errorMessage,
    setErrorMessage,
    passwordStrength,
    handleGoogleSignup,
    handleRegisterSubmit,
  } = useRegisterForm();

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden antialiased selection:bg-primary/20 selection:text-primary">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos Ambientais no Fundo */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] md:w-[680px] h-[300px] md:h-[360px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -right-16 w-64 md:w-80 h-64 md:h-80 bg-secondary-container/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Top Header Simplificado com Logo */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-10 pr-14 sm:pr-0">
        <AppFrameLogo size="sm" onClick={() => navigate('scraper')} />
        <button
          type="button"
          onClick={() => navigate('login')}
          className="font-title-sm text-title-sm text-neutral-600 dark:text-on-surface-variant hover:text-neutral-950 dark:hover:text-primary transition-colors cursor-pointer mr-0 sm:mr-16"
        >
          Já tem conta? <span className="font-semibold text-[#B8851B] dark:text-[#D4A346] underline">Entrar</span>
        </button>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 z-10 w-full">
        <div className="relative flex flex-col items-center justify-center w-full max-w-[440px] mx-auto">
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
              onGoogleClick={handleGoogleSignup}
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
            <form className="flex flex-col gap-3.5 mt-space-md" onSubmit={handleRegisterSubmit}>
              <Input
                label="Nome Completo"
                placeholder="Seu nome e sobrenome"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
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
                  placeholder="Mínimo de 8 caracteres"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                  minLength={8}
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

                {/* Indicador Visual Dinâmico de Força de Senha */}
                <PasswordStrengthIndicator passwordStrength={passwordStrength} />
              </div>

              <div className="mt-1">
                <Checkbox
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  label={
                    <span>
                      Li e concordo com os{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLegalModalDoc('terms');
                          setLegalModalOpen(true);
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
                          setLegalModalDoc('privacy');
                          setLegalModalOpen(true);
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

            {/* Rodapé Alternativo (Login) */}
            <div className="mt-space-lg flex flex-col items-center gap-space-md text-center">
              <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF]">
                Já é cadastrado no AppFrame?{' '}
                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="text-[#B8851B] dark:text-[#D4A346] hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Entrar
                </button>
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer com Links Legais e Modal Integrado */}
      <AuthFooter />

      {/* Modal de Documentos Legais (disparado pelo link no checkbox) */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialDoc={legalModalDoc}
      />
    </div>
  );
};
