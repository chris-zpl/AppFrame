import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { TwoFactorCodeInputs } from './TwoFactorCodeInputs';
import { TwoFactorBackupInput } from './TwoFactorBackupInput';

interface TwoFactorChallengeCardProps {
  isBackupMode: boolean;
  digits: string[];
  backupCode: string;
  inputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  isLoading: boolean;
  isComplete: boolean;
  errorMessage: string | null;
  onDigitChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onBackupCodeChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
  onCancel: () => void;
}

export const TwoFactorChallengeCard: React.FC<TwoFactorChallengeCardProps> = ({
  isBackupMode,
  digits,
  backupCode,
  inputRefs,
  isLoading,
  isComplete,
  errorMessage,
  onDigitChange,
  onKeyDown,
  onPaste,
  onBackupCodeChange,
  onSubmit,
  onToggleMode,
  onCancel,
}) => {
  return (
    <Card
      variant="auth"
      className="w-full p-6 md:p-space-lg relative overflow-hidden transition-all duration-300 shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-surface-container-high/80"
    >
      {/* Cabeçalho */}
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-surface-container-highest flex items-center justify-center text-amber-700 dark:text-primary mb-space-sm shadow-[0_0_20px_rgba(212,163,70,0.25)] border border-primary/30">
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

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
        {!isBackupMode ? (
          <TwoFactorCodeInputs
            digits={digits}
            inputRefs={inputRefs}
            onChange={onDigitChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            disabled={isLoading}
          />
        ) : (
          <TwoFactorBackupInput
            value={backupCode}
            onChange={onBackupCodeChange}
            disabled={isLoading}
          />
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
            onClick={onToggleMode}
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
            onClick={onCancel}
            className="text-neutral-600 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface text-label-md font-label-md transition-colors cursor-pointer"
          >
            Cancelar e voltar ao Login
          </button>
        </div>
      </form>
    </Card>
  );
};
