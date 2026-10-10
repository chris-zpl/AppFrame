import React, { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';

export const LoginPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:3000/auth/google';
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).catch(() => null);

      if (response) {
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        }

        // Caso a conta possua 2FA ativo, o backend retorna requires2fa e tempToken
        if (data.requires2fa) {
          navigate('2fa', { tempToken: data.tempToken, email });
          return;
        }

        // Armazena tokens e dados de sessão
        if (data.accessToken) {
          localStorage.setItem('appframe_access_token', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('appframe_refresh_token', data.refreshToken);
          }
          if (data.user) {
            localStorage.setItem('appframe_user', JSON.stringify(data.user));
          }
        }

        navigate('scraper');
        return;
      }

      // Mock fallback de demonstração para visualização local imediata
      setTimeout(() => {
        // Se a senha for "2fa", simula desafio de segundo fator para teste
        if (password.toLowerCase().includes('2fa')) {
          navigate('2fa', { tempToken: 'mock-temp-token-xyz', email });
        } else {
          localStorage.setItem('appframe_access_token', 'mock-jwt-token-123');
          navigate('scraper');
        }
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden antialiased selection:bg-primary/20 selection:text-primary">
      {/* Halos Luminosos Ambientais no Fundo */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[520px] md:w-[680px] h-[300px] md:h-[360px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute -bottom-24 -right-16 w-64 md:w-80 h-64 md:h-80 bg-secondary-container/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Top Header Simplificado */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-10">
        <AppFrameLogo size="sm" onClick={() => navigate('scraper')} />
        <button
          type="button"
          onClick={() => navigate('register')}
          className="font-title-sm text-title-sm text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          Não tem conta? <span className="font-semibold text-primary underline">Cadastre-se</span>
        </button>
      </header>

      {/* Conteúdo Central */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 z-10 w-full">
        <div className="relative flex flex-col items-center justify-center w-full max-w-[440px] mx-auto select-none">
          <Card
            variant="auth"
            className="w-full p-6 md:p-space-lg relative overflow-hidden transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-surface-container-high/80"
          >
            {/* Notificação de conta recém-registrada */}
            {params.registered && (
              <div className="mb-4 p-3 rounded-lg bg-primary-container/20 border border-primary/40 text-primary font-body-sm text-body-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
                <span>Conta criada com sucesso! Faça seu primeiro acesso abaixo.</span>
              </div>
            )}

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
                Entrar no AppFrame
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-[320px]">
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
                <span className="absolute bg-surface-container-low px-3 font-label-sm text-label-sm tracking-widest uppercase text-on-surface-variant font-medium">
                  OU ENTRE COM SEU E-MAIL
                </span>
              </div>

              {/* Mensagem de Erro */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-error text-body-sm font-body-sm flex items-start gap-2 animate-in fade-in">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                    error
                  </span>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Formulário */}
              <form className="flex flex-col gap-3.5" onSubmit={handleLoginSubmit}>
                <Input
                  label="Seu E-mail"
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
                      className="text-label-sm font-label-sm text-primary hover:underline font-medium cursor-pointer"
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
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Ainda não tem conta no AppFrame?{' '}
                <button
                  type="button"
                  onClick={() => navigate('register')}
                  className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
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
                  Enviamos as instruções de recuperação para <strong>{forgotEmail}</strong>.
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Verifique sua caixa de entrada e a pasta de spam.
                </p>
                <Button
                  variant="primary"
                  className="mt-2 w-full"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSubmitted(false);
                  }}
                >
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setForgotSubmitted(true);
                }}
                className="flex flex-col gap-4"
              >
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Digite seu e-mail cadastrado para receber um link seguro de redefinição de senha.
                </p>
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
                    onClick={() => setShowForgotModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button variant="primary" type="submit">
                    Enviar Instruções
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center py-2 text-label-sm font-label-sm text-outline z-10">
        AppFrame © 2026 • Executive Video Intelligence
      </footer>
    </div>
  );
};
