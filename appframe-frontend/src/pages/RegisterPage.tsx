import React, { useState, useMemo, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth, isPublicAuthRoute } from '../contexts/AuthContext';
import { authService } from '../services/auth.service';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { API_BASE_URL } from '../services/api';
import { toast } from 'sonner';

export const RegisterPage: React.FC = () => {
  const { navigate } = useNavigation();
  const { isAuthenticated } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Retorna usuário já autenticado para a tela em que estava, impedindo acesso ao registro
  useEffect(() => {
    if (isAuthenticated) {
      let lastActive: string | null = null;
      try {
        lastActive = sessionStorage.getItem('appframe_last_active_route');
      } catch {}

      const target = lastActive && !isPublicAuthRoute(lastActive) ? lastActive : '/varredura';
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Análise determinística de força de senha
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Vazia', colorClass: 'bg-surface-container-highest', isStrong: false };
    
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Muito Fraca', colorClass: 'bg-error', isStrong: false };
      case 2:
        return { score: 2, label: 'Razoável', colorClass: 'bg-tertiary', isStrong: false };
      case 3:
        return { score: 3, label: 'Forte', colorClass: 'bg-primary', isStrong: true };
      case 4:
      default:
        return { score: 4, label: 'Excelente', colorClass: 'bg-primary shadow-[0_0_8px_rgba(242,190,94,0.4)]', isStrong: true };
    }
  }, [password]);

  const handleGoogleSignup = () => {
    // Redireciona para o endpoint OAuth do NestJS ou simula callback
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!agreeTerms) {
      setErrorMessage('Você deve concordar com os Termos de Serviço para continuar.');
      return;
    }

    if (!passwordStrength.isStrong) {
      setErrorMessage('Por favor, crie uma senha mais forte com no mínimo 8 caracteres, números e símbolos.');
      return;
    }

    setIsLoading(true);

    try {
      await authService.register({ name, email, password });
      toast.success('Conta criada com sucesso! Faça login para acessar o AppFrame.');
      navigate('login', { registered: 'true', email });
    } catch (err: any) {
      const status = err?.response?.status;
      let msg =
        err?.response?.data?.message ||
        err?.message;

      if (status === 409) {
        msg = 'Já existe um usuário cadastrado com este e-mail. Faça login ou utilize outro e-mail.';
      } else if (!msg) {
        msg = 'Falha ao registrar conta. Tente novamente.';
      }

      // Exibe inline no formulário e NÃO dispara via Sonner toast
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden antialiased selection:bg-primary/20 selection:text-primary">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos Ambientais no Fundo (Referência 1) */}
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
        <div className="relative flex flex-col items-center justify-center w-full max-w-[440px] mx-auto select-none">
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
                Criar Conta no AppFrame
              </h1>
              <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF] mt-1 max-w-[320px]">
                Automação, cortes dinâmicos e legendas inteligentes
              </p>
            </div>

            {/* Botão Google + Divisor */}
            <div className="mt-space-lg flex flex-col gap-space-md">
              <Button
                variant="google"
                onClick={handleGoogleSignup}
                type="button"
              >
                Cadastrar com o Google
              </Button>

              <div className="relative flex items-center justify-center my-1">
                <div className="w-full h-px bg-surface-container-highest" />
                <span className="absolute bg-white dark:bg-surface-container-low px-3 font-label-sm text-label-sm tracking-widest uppercase text-neutral-500 dark:text-[#949DAF] font-medium">
                  OU CADASTRE COM SEU E-MAIL
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
              <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
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

                  {/* Indicador Visual Dinâmico de Força de Senha (4 barras) */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="grid grid-cols-4 gap-1.5">
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 1 ? passwordStrength.colorClass : 'bg-surface-container-highest'
                        }`}
                      />
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 2 ? passwordStrength.colorClass : 'bg-surface-container-highest'
                        }`}
                      />
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 3 ? passwordStrength.colorClass : 'bg-surface-container-highest'
                        }`}
                      />
                      <div
                        className={`h-1 rounded-full transition-all duration-300 ${
                          passwordStrength.score >= 4 ? passwordStrength.colorClass : 'bg-surface-container-highest'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-neutral-600 dark:text-on-surface-variant">
                        <span className="material-symbols-outlined text-[14px] text-primary">
                          verified_user
                        </span>
                        <span className="font-label-sm text-label-sm">
                          Mínimo de 8 caracteres, números e símbolos
                        </span>
                      </div>
                      <span
                        className={`font-label-sm text-label-sm font-semibold transition-colors ${
                          passwordStrength.score >= 3 ? 'text-[#B8851B] dark:text-primary' : 'text-neutral-600 dark:text-on-surface-variant'
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-1">
                  <Checkbox
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    label={
                      <span>
                        Li e concordo com os{' '}
                        <a href="#termos" className="text-[#B8851B] dark:text-[#D4A346] hover:underline font-semibold">
                          Termos de Serviço
                        </a>{' '}
                        e a{' '}
                        <a href="#privacidade" className="text-[#B8851B] dark:text-[#D4A346] hover:underline font-semibold">
                          Política de Privacidade
                        </a>{' '}
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
            </div>

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

      {/* Footer */}
      <footer className="w-full text-center py-2 text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF] z-10">
        AppFrame © 2026 • Executive Video Intelligence
      </footer>
    </div>
  );
};
