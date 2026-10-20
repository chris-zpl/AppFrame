import React, { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigation } from '../../../contexts/NavigationContext';
import { authService } from '../services/auth.service';
import { calculatePasswordStrength } from '../utils/password.utils';
import { API_BASE_URL } from '../../../lib/api';

export const useRegisterForm = () => {
  const { navigate } = useNavigation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  const handleGoogleSignup = useCallback(() => {
    try {
      localStorage.removeItem('appframe_remember_me');
      localStorage.removeItem('appframe_has_session');
      sessionStorage.setItem('appframe_has_session', 'true');
    } catch {}
    window.location.href = `${API_BASE_URL}/auth/google?rememberMe=false`;
  }, []);

  const handleRegisterSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);

      if (!agreeTerms) {
        setErrorMessage('Você deve concordar com os Termos de Serviço para continuar.');
        return;
      }

      if (!password) {
        setErrorMessage('Por favor, informe uma senha de acesso.');
        return;
      }

      if (password.length < 8) {
        setErrorMessage('A senha deve ter no mínimo 8 caracteres.');
        return;
      }

      if (!passwordStrength.isStrong) {
        setErrorMessage(
          'Por favor, crie uma senha mais forte com no mínimo 8 caracteres, números e símbolos.'
        );
        return;
      }

      setIsLoading(true);

      try {
        await authService.register({ name, email, password });
        toast.success('Conta criada com sucesso! Faça login para acessar o AppFrame.');
        navigate('login', { registered: 'true', email });
      } catch (err: any) {
        const status = err?.response?.status;
        let msg = err?.response?.data?.message || err?.message;

        if (status === 409) {
          msg = 'Já existe um usuário cadastrado com este e-mail. Faça login ou utilize outro e-mail.';
        } else if (!msg) {
          msg = 'Falha ao registrar conta. Tente novamente.';
        }

        setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
      } finally {
        setIsLoading(false);
      }
    },
    [agreeTerms, email, name, navigate, password, passwordStrength.isStrong]
  );

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    agreeTerms,
    setAgreeTerms,
    isLoading,
    errorMessage,
    setErrorMessage,
    passwordStrength,
    handleGoogleSignup,
    handleRegisterSubmit,
  };
};
