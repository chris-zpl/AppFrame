import React, { useState, useRef, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth, isPublicAuthRoute } from '../contexts/AuthContext';

export const TwoFactorChallengePage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const { verify2fa } = useAuth();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-foco no primeiro campo ao carregar
  useEffect(() => {
    if (!isBackupMode && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [isBackupMode]);

  const handleDigitChange = (index: number, value: string) => {
    // Aceita apenas números
    const cleanChar = value.replace(/\D/g, '').slice(-1);

    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);
    setErrorMessage(null);

    // Se digitou e não é o último, avança para o próximo
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    // Foca no último preenchido ou no 6º
    const lastFilledIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  };

  const isComplete = isBackupMode
    ? backupCode.trim().length >= 6
    : digits.every((d) => d.length === 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;

    setIsLoading(true);
    setErrorMessage(null);

    const code = isBackupMode ? backupCode.trim() : digits.join('');
    const tempToken = params.tempToken || '';

    try {
      await verify2fa(tempToken, code);
      let lastActive: string | null = null;
      try {
        lastActive = sessionStorage.getItem('appframe_last_active_route');
      } catch {}

      const target = lastActive && !isPublicAuthRoute(lastActive) ? lastActive : '/varredura';
      navigate(target, { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Código de verificação incorreto ou expirado.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden select-none">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[340px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute -bottom-20 -right-16 w-72 h-72 bg-secondary-container/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2 z-10 pr-14 sm:pr-0">
        <AppFrameLogo size="sm" onClick={() => navigate('scraper')} />
        <button
          type="button"
          onClick={() => navigate('login')}
          className="font-title-sm text-title-sm text-neutral-600 dark:text-on-surface-variant hover:text-neutral-950 dark:hover:text-primary transition-colors cursor-pointer mr-0 sm:mr-16"
        >
          Voltar para o Login
        </button>
      </header>

      {/* Card Central */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 z-10 w-full">
        <div className="relative flex flex-col items-center justify-center w-full max-w-[440px] mx-auto">
          <Card
            variant="auth"
            className="w-full p-6 md:p-space-lg relative overflow-hidden transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-surface-container-high/80"
          >
            {/* Cabeçalho */}
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary mb-space-sm shadow-[0_0_20px_rgba(212,163,70,0.25)] border border-primary/30">
                <span className="material-symbols-outlined text-[28px]">
                  shield_locked
                </span>
              </div>

              <h1 className="font-headline-sm text-headline-sm text-neutral-900 dark:text-[#F8F9FA] font-bold tracking-tight">
                Verificação em Duas Etapas
              </h1>
              <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF] mt-1.5 max-w-[340px]">
                {isBackupMode
                  ? 'Insira um dos seus códigos de recuperação gerados na ativação do 2FA.'
                  : 'Insira o código de 6 dígitos gerado no seu aplicativo autenticador (Google Authenticator, Authy, etc.).'}
              </p>
            </div>

            {/* Mensagem de Erro */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-error-container/40 border border-error/30 text-error text-body-sm font-body-sm flex items-start gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
              {!isBackupMode ? (
                /* 6 Inputs Numéricos Tabulares Independentes */
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5 w-full">
                    {digits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        onPaste={idx === 0 ? handlePaste : undefined}
                        className={`w-12 h-14 sm:w-13 sm:h-16 text-center text-[24px] sm:text-[28px] font-bold rounded-xl bg-white dark:bg-surface-container-lowest border transition-all duration-200 outline-none tabular-nums ${
                          digit
                            ? 'border-primary text-[#B8851B] dark:text-primary shadow-[0_0_12px_rgba(242,190,94,0.25)]'
                            : 'border-neutral-300 dark:border-surface-container-highest text-neutral-900 dark:text-on-surface focus:border-primary/80 focus:ring-2 focus:ring-primary/20'
                        }`}
                      />
                    ))}
                  </div>

                  <span className="text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF] mt-1">
                    Cole o código de 6 dígitos ou digite individualmente
                  </span>
                </div>
              ) : (
                /* Input para Código Reserva */
                <div className="flex flex-col gap-2">
                  <Input
                    label="Código de Recuperação"
                    placeholder="Ex: A8B2-9F1C-4D"
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    required
                    leftIcon={
                      <span className="material-symbols-outlined text-[18px]">
                        key
                      </span>
                    }
                  />
                  <span className="text-label-sm font-label-sm text-neutral-500 dark:text-[#949DAF]">
                    Códigos reserva são de uso único
                  </span>
                </div>
              )}

              {/* Botão de Validação */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                disabled={!isComplete}
                className="w-full mt-2"
                rightIcon={
                  <span className="material-symbols-outlined text-[18px]">
                    check_circle
                  </span>
                }
              >
                Confirmar e Entrar
              </Button>

              {/* Alternador de Modo (Código TOTP <-> Código Reserva) */}
              <div className="flex flex-col items-center gap-2 pt-2 border-t border-surface-container-highest/60">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupMode(!isBackupMode);
                    setErrorMessage(null);
                  }}
                  className="text-[#B8851B] dark:text-[#D4A346] hover:underline text-body-sm font-body-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isBackupMode ? 'phonelink_ring' : 'vpn_key'}
                  </span>
                  <span>
                    {isBackupMode
                      ? 'Usar código do aplicativo autenticador'
                      : 'Perdeu o celular? Usar código de recuperação'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('login')}
                  className="text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface text-label-md font-label-md transition-colors cursor-pointer"
                >
                  Cancelar e voltar ao Login
                </button>
              </div>
            </form>
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
