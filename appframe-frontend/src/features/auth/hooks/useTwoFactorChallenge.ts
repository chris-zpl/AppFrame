import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../context';
import { useNavigation } from '../../../contexts/NavigationContext';
import { getAuthRedirectTarget } from '../utils/auth.helpers';
import {
  cleanNumericDigit,
  parsePastedCode,
  isTotpCodeComplete,
  isBackupCodeValid,
} from '../utils/twofactor.utils';

export interface UseTwoFactorChallengeOptions {
  tempToken?: string;
}

/**
 * Hook customizado para encapsular a lógica de entrada e submissão do desafio de 2FA.
 */
export const useTwoFactorChallenge = (options?: UseTwoFactorChallengeOptions) => {
  const { navigate } = useNavigation();
  const { verify2fa } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Foco automático no primeiro campo ao carregar ou alternar modo
  useEffect(() => {
    if (!isBackupMode && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [isBackupMode]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    const cleanChar = cleanNumericDigit(value);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = cleanChar;
      return next;
    });
    setErrorMessage(null);

    // Se digitou e não é o último, avança para o próximo
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (!digits[index] && index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'ArrowRight' && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const raw = e.clipboardData.getData('text');
    const pasted = parsePastedCode(raw, 6);
    if (!pasted.some((d) => d.length > 0)) return;

    setDigits(pasted);
    setErrorMessage(null);

    const filledCount = pasted.filter((d) => d.length > 0).length;
    const lastFilledIndex = Math.min(filledCount, 5);
    inputRefs.current[lastFilledIndex]?.focus();
  }, []);

  const isComplete = isBackupMode
    ? isBackupCodeValid(backupCode)
    : isTotpCodeComplete(digits);

  const toggleMode = useCallback(() => {
    setIsBackupMode((prev) => !prev);
    setErrorMessage(null);
  }, []);

  const submitChallenge = useCallback(
    async (tokenToVerify?: string) => {
      if (!isComplete) return;

      const activeTempToken = tokenToVerify || options?.tempToken || '';
      if (!activeTempToken) {
        setErrorMessage('Sessão de verificação expirada ou inválida. Por favor, faça login novamente.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      const code = isBackupMode ? backupCode.trim() : digits.join('');

      try {
        const result = await verify2fa(activeTempToken, code);
        const target = getAuthRedirectTarget(result?.user);
        navigate(target, { replace: true });
        return result;
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Código de verificação incorreto ou expirado.';
        setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [backupCode, digits, isBackupMode, isComplete, navigate, options?.tempToken, verify2fa]
  );

  return {
    digits,
    setDigits,
    isBackupMode,
    setIsBackupMode,
    toggleMode,
    backupCode,
    setBackupCode,
    isLoading,
    errorMessage,
    setErrorMessage,
    inputRefs,
    handleDigitChange,
    handleKeyDown,
    handlePaste,
    isComplete,
    submitChallenge,
  };
};
