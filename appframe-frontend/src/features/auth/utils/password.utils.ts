export interface PasswordStrengthResult {
  score: number;
  label: string;
  colorClass: string;
  isStrong: boolean;
}

/**
 * Análise determinística de força de senha para formulários de registro e recuperação.
 */
export const calculatePasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return { score: 0, label: 'Vazia', colorClass: 'bg-surface-container-highest', isStrong: false };
  }

  // Regra estrita: O comprimento mínimo de 8 caracteres é pré-requisito mandatório
  const hasMinLength = password.length >= 8;
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  if (!hasMinLength) {
    return {
      score: 1,
      label: 'Muito Curta (mín. 8)',
      colorClass: 'bg-error',
      isStrong: false,
    };
  }

  let score = 1;
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
      return {
        score: 4,
        label: 'Excelente',
        colorClass: 'bg-primary shadow-[0_0_8px_rgba(242,190,94,0.4)]',
        isStrong: true,
      };
  }
};
