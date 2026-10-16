import React, { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { authService, useGuestGuard, getAuthRedirectTarget } from '../features/auth';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { API_BASE_URL } from '../lib/api';
import { LegalModal } from '../components/legal';

export const LoginPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const { user, refreshProfile } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalModalDoc, setLegalModalDoc] = useState<'terms' | 'privacy'>('terms');
  const isForgotSubmittingRef = useRef(false);

  useGuestGuard();

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const data = await authService.login({ email, password, rememberMe });
      try {
        if (rememberMe) {
          localStorage.setItem('appframe_remember_me', 'true');
          localStorage.setItem('appframe_has_session', 'true');
        } else {
          localStorage.removeItem('appframe_remember_me');
          localStorage.removeItem('appframe_has_session');
          sessionStorage.setItem('appframe_has_session', 'true');
        }
      } catch {}

      if (data.requires2fa || data.require_2fa) {
        navigate('2fa', { tempToken: data.tempToken || data.temp_token || '', email });
        return;
      }
      const loggedProfile = await refreshProfile();
      const currentUser = loggedProfile || data.user || (data as any)?.data?.user || user;

      const fromPath = (location.state as any)?.from?.pathname;
      const fromSearch = (location.state as any)?.from?.search || '';
      const fromUrl = fromPath ? `${fromPath}${fromSearch}` : null;
      const target = getAuthRedirectTarget(currentUser, fromUrl);
      navigate(target, { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;
      let msg =
        err?.response?.data?.message ||
        err?.message;

      if (status === 401 || !msg) {
        msg = 'Credenciais inválidas. Verifique seu e-mail e senha.';
      }

      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="flex flex-col items-center text-center">
              <div className="mb-space-sm">
                <AppFrameLogo size="xl" showText={false} glow />
              </div>

              <div className="flex items-center gap-1 font-headline-md text-headline-md tracking-tight mb-space-xs">
                <span className="text-on-surface font-bold">App</span>
                <span className="text-primary font-bold">Frame</span>
              </div>

              <h1 className="font-title-md text-title-md text-neutral-900 dark:text-[#F8F9FA] font-semibold tracking-normal">
                Entrar no AppFrame
              </h1>
              <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF] mt-1 max-w-[320px]">
                Acesse o painel executivo de edição e inteligência de vídeo
              </p>
            </div>

            {/* Botão Google + Divisor */}
            <div className="mt-space-lg flex flex-col gap-space-md">
              <Button
                variant="google"
                onClick={handleGoogleLogin}
                type="button"
              >
                Entrar com o Google
              </Button>

              <div className="relative flex items-center justify-center my-1">
                <div className="w-full h-px bg-surface-container-highest" />
                <span className="absolute bg-white dark:bg-surface-container-low px-3 font-label-sm text-label-sm tracking-widest uppercase text-neutral-500 dark:text-[#949DAF] font-medium">
                  OU ENTRE COM SEU E-MAIL
                </span>
              </div>

              {/* Mensagem de Erro */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-error-container/30 border border-red-200 dark:border-error/40 text-red-800 dark:text-[#ffdad6] text-body-sm font-body-sm flex items-start gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-red-600 dark:text-error">
                    error
                  </span>
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Formulário */}
              <form className="flex flex-col gap-3.5" onSubmit={handleLoginSubmit}>
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
            </div>

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
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md bg-surface-container rounded-2xl p-6 shadow-2xl border border-surface-container-high">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[24px]">
                  lock_reset
                </span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Recuperar Senha
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSubmitted(false);
                }}
                className="text-outline hover:text-on-surface p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[28px]">
                    mark_email_read
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface">
                  Se o e-mail estiver cadastrado, enviamos as instruções de recuperação para <strong>{forgotEmail}</strong>.
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  O link expira em 1 hora. Verifique sua caixa de entrada e a pasta de spam.
                </p>
                <Button
                  variant="primary"
                  className="mt-2 w-full"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSubmitted(false);
                    setForgotError(null);
                  }}
                >
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotEmail || forgotLoading || isForgotSubmittingRef.current) return;
                  isForgotSubmittingRef.current = true;
                  setForgotLoading(true);
                  setForgotError(null);
                  try {
                    await authService.requestPasswordReset(forgotEmail);
                    setForgotSubmitted(true);
                  } catch (err: any) {
                    setForgotError(
                      err?.response?.data?.message || err?.message || 'Falha ao solicitar redefinição.',
                    );
                  } finally {
                    setForgotLoading(false);
                    isForgotSubmittingRef.current = false;
                  }
                }}
                className="flex flex-col gap-4"
              >
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Digite seu e-mail cadastrado para receber um link seguro de redefinição de senha (válido por 1 hora).
                </p>
                {forgotError && (
                  <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-body-sm">
                    {forgotError}
                  </div>
                )}
                <Input
                  label="Seu E-mail"
                  placeholder="nome@empresa.com"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">
                      mail
                    </span>
                  }
                />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={forgotLoading}
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button variant="primary" type="submit" disabled={forgotLoading}>
                    {forgotLoading ? 'Enviando...' : 'Enviar Instruções'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center py-4 text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF] z-10 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span>AppFrame © 2026 • Executive Video Intelligence</span>
        <span className="hidden sm:inline">•</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setLegalModalDoc('terms');
              setLegalModalOpen(true);
            }}
            className="hover:text-primary transition-colors cursor-pointer hover:underline"
          >
            Termos de Serviço
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              setLegalModalDoc('privacy');
              setLegalModalOpen(true);
            }}
            className="hover:text-primary transition-colors cursor-pointer hover:underline"
          >
            Política de Privacidade
          </button>
        </div>
      </footer>

      {/* Modal de Documentos Legais */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialDoc={legalModalDoc}
      />
    </div>
  );
};
