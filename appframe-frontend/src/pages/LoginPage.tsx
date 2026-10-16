import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import {
  useGuestGuard,
  useLoginForm,
  AuthCardHeader,
  SocialLoginDivider,
  AuthFooter,
  ForgotPasswordModal,
} from '../features/auth';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';

export const LoginPage: React.FC = () => {
  const { navigate, params } = useNavigation();

  useGuestGuard();

  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    errorMessage,
    setErrorMessage,
    showForgotModal,
    setShowForgotModal,
    handleGoogleLogin,
    handleLoginSubmit,
  } = useLoginForm({ initialEmail: params.email });

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden antialiased selection:bg-primary/20 selection:text-primary">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos Ambientais no Fundo */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] md:w-[680px] h-[300px] md:h-[360px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -right-16 w-64 md:w-80 h-64 md:h-80 bg-secondary-container/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Top Header Simplificado */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-10 pr-14 sm:pr-0">
        <AppFrameLogo size="sm" onClick={() => navigate('scraper')} />
        <button
          type="button"
          onClick={() => navigate('register')}
          className="font-title-sm text-title-sm text-neutral-600 dark:text-on-surface-variant hover:text-neutral-950 dark:hover:text-primary transition-colors cursor-pointer mr-0 sm:mr-16"
        >
          Não tem conta? <span className="font-semibold text-[#B8851B] dark:text-[#D4A346] underline">Cadastre-se</span>
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
              title="Entrar no AppFrame"
              subtitle="Acesse o painel executivo de edição e inteligência de vídeo"
            />

            {/* Botão Google + Divisor */}
            <SocialLoginDivider
              buttonText="Entrar com o Google"
              dividerText="OU ENTRE COM SEU E-MAIL"
              onGoogleClick={handleGoogleLogin}
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
            <form className="flex flex-col gap-3.5 mt-space-md" onSubmit={handleLoginSubmit}>
              <Input
                label="Seu E-mail"
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
                  placeholder="••••••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
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

                {/* Linha Auxiliar: Lembrar dispositivo e Recuperação de Senha */}
                <div className="flex items-center justify-between mt-1">
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    label="Lembrar deste dispositivo"
                  />

                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
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

            {/* Rodapé Alternativo (Cadastro) */}
            <div className="mt-space-lg flex flex-col items-center gap-space-md text-center">
              <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF]">
                Ainda não tem conta no AppFrame?{' '}
                <button
                  type="button"
                  onClick={() => navigate('register')}
                  className="text-[#B8851B] dark:text-[#D4A346] hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Cadastre-se
                </button>
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Modal de Recuperação de Senha */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        initialEmail={email}
      />

      {/* Footer com Links Legais e Modal Integrado */}
      <AuthFooter />
    </div>
  );
};
