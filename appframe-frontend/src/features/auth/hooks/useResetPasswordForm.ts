import React, { useState, useMemo, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { calculatePasswordStrength } from '../utils/password.utils';

interface UseResetPasswordFormOptions {
  token: string;
}

export const useResetPasswordForm = ({ token }: UseResetPasswordFormOptions) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordStrength = useMemo(() => calculatePasswordStrength(newPassword), [newPassword]);

  const handleResetSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        setErrorMessage(
          'Por favor, crie uma senha mais forte com no mínimo 8 caracteres, números e símbolos.'
        );
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
        setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
      } finally {
        setIsLoading(false);
      }
    },
    [confirmPassword, newPassword, passwordStrength.isStrong, token]
  );

  return {
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isLoading,
    errorMessage,
    setErrorMessage,
    isSuccess,
    setIsSuccess,
    passwordStrength,
    handleResetSubmit,
  };
};
