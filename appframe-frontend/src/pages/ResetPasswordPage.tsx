import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../features/auth';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Análise determinística de força de senha (idêntica ao cadastro)
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: 'Vazia', colorClass: 'bg-surface-container-highest', isStrong: false };
    
    // Regra estrita: O comprimento mínimo de 8 caracteres é pré-requisito mandatório
    const hasMinLength = newPassword.length >= 8;
    const hasUpperAndLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

    if (!hasMinLength) {
      return {
        score: 1,
        label: 'Muito Curta (mín. 8)',
        colorClass: 'bg-error',
        isStrong: false,
      };
    }

    let score = 1; // 1 ponto pelo tamanho >= 8
    if (hasUpperAndLower) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecial) score += 1;

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
  }, [newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Token de redefinição não encontrado na URL. Solicite um novo link.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (!passwordStrength.isStrong) {
      setErrorMessage('Por favor, crie uma senha mais forte com no mínimo 8 caracteres, números e símbolos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({ token, newPassword });
      setIsSuccess(true);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível redefinir a senha. O token pode ter expirado ou ser inválido.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-surface overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Background Decorativo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[140px]" />
      </div>

      {/* Header com Logo e ThemeToggle */}
      <header className="w-full flex items-center justify-between px-space-md py-4 md:px-space-xl z-10">
        <div
          className="flex items-center gap-space-sm cursor-pointer"
          onClick={() => navigate('/login')}
        >
          <AppFrameLogo className="w-8 h-8" />
          <span className="font-title-lg text-title-lg font-bold tracking-tight text-on-surface">
            AppFrame
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 z-10">
        <div className="w-full max-w-[460px]">
          <Card
            variant="auth"
            className="w-full p-6 md:p-8"
          >
            {isSuccess ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                  <span className="material-symbols-outlined text-[32px]">
                    check_circle
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
                    Senha Alterada!
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                    Sua senha foi redefinida com sucesso. Todas as sessões anteriores foram desconectadas por segurança.
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="mt-4 w-full"
                  onClick={() => navigate('/login')}
                >
                  Ir para o Login
                </Button>
              </div>
            ) : !token ? (
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-14 h-14 rounded-full bg-error/10 text-error flex items-center justify-center border border-error/20">
                  <span className="material-symbols-outlined text-[32px]">
                    link_off
                  </span>
                </div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
                    Link Inválido
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                    Nenhum código de redefinição foi identificado na URL. Solicite uma nova recuperação na tela de login.
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="mt-4 w-full"
                  onClick={() => navigate('/login')}
                >
                  Voltar ao Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="text-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-[26px]">
                      lock_reset
                    </span>
                  </div>
                  <h1 className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight">
                    Redefinir Senha
                  </h1>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                    Crie uma nova senha segura para acessar sua conta.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl text-error text-body-sm flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
                      error
                    </span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Input
                      label="Nova Senha"
                      placeholder="Mínimo de 8 caracteres"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
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
                          className="text-on-surface-variant hover:text-on-surface p-1 transition-colors flex items-center justify-center cursor-pointer"
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

                  <Input
                    label="Confirmar Nova Senha"
                    placeholder="Repita a nova senha"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    required
                    minLength={8}
                    leftIcon={
                      <span className="material-symbols-outlined text-[18px]">
                        lock_clock
                      </span>
                    }
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label="Mostrar ou ocultar confirmação de senha"
                        className="text-on-surface-variant hover:text-on-surface p-1 transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    }
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Redefinindo senha...' : 'Salvar Nova Senha'}
                  </Button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-body-sm font-medium text-neutral-600 dark:text-[#949DAF] hover:underline cursor-pointer"
                  >
                    Voltar ao login
                  </button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </main>

      {/* Rodapé Institucional */}
      <footer className="w-full text-center py-4 text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF] z-10">
        AppFrame © 2026 • Executive Video Intelligence
      </footer>
    </div>
  );
};
