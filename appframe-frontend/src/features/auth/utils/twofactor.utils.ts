/**
 * Utilitários para validação e manipulação de códigos de Verificação em Duas Etapas (2FA).
 */

/**
 * Filtra o valor digitado para manter apenas um único dígito numérico (0-9).
 */
export const cleanNumericDigit = (value: string): string => {
  return value.replace(/\D/g, '').slice(-1);
};

/**
 * Processa string colada da área de transferência, extraindo até `length` dígitos numéricos.
 */
export const parsePastedCode = (pastedText: string, length = 6): string[] => {
  const cleanDigits = pastedText.replace(/\D/g, '').slice(0, length);
  const result: string[] = [];
  for (let i = 0; i < length; i++) {
    result.push(cleanDigits[i] || '');
  }
  return result;
};

/**
 * Valida se os 6 dígitos TOTP estão completamente preenchidos.
 */
export const isTotpCodeComplete = (digits: string[]): boolean => {
  return digits.length === 6 && digits.every((d) => d.trim().length === 1);
};

/**
 * Valida se um código de recuperação possui formato válido (mínimo 6 caracteres).
 */
export const isBackupCodeValid = (code: string): boolean => {
  return code.trim().length >= 6;
};
