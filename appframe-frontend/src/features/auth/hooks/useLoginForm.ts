import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useAuth } from '../context';
import { authService } from '../services/auth.service';
import { getAuthRedirectTarget } from '../utils/auth.helpers';
import { API_BASE_URL } from '../../../lib/api';

interface UseLoginFormOptions {
  initialEmail?: string;
}

export const useLoginForm = (options?: UseLoginFormOptions) => {
  const { navigate } = useNavigation();
  const { user, refreshProfile } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState(options?.initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleGoogleLogin = useCallback(() => {
    try {
      if (rememberMe) {
        localStorage.setItem('appframe_remember_me', 'true');
        localStorage.setItem('appframe_has_session', 'true');
      } else {
        localStorage.removeItem('appframe_remember_me');
        localStorage.removeItem('appframe_has_session');
      }
      sessionStorage.setItem('appframe_has_session', 'true');
    } catch {}
    window.location.href = `${API_BASE_URL}/auth/google?rememberMe=${rememberMe}`;
  }, [rememberMe]);

  const handleLoginSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMessage(null);
      setIsLoading(true);

      try {
        const data = await authService.login({ email, password, rememberMe });
        try {
          if (rememberMe) {
            localStorage.setItem('appframe_remember_me', 'true');
            localStorage.setItem('appframe_has_session', 'true');
          } else {
            localStorage.removeItem('appframe_remember_me');
            localStorage.removeItem('appframe_has_session');
            sessionStorage.setItem('appframe_has_session', 'true');
          }
        } catch {}

        if (data.requires2fa || data.require_2fa) {
          navigate('2fa', { tempToken: data.tempToken || data.temp_token || '', email, rememberMe });
          return;
        }

        const loggedProfile = await refreshProfile();
        const currentUser = loggedProfile || data.user || (data as any)?.data?.user || user;

        const fromPath = (location.state as any)?.from?.pathname;
        const fromSearch = (location.state as any)?.from?.search || '';
        const fromUrl = fromPath ? `${fromPath}${fromSearch}` : null;
        const target = getAuthRedirectTarget(currentUser, fromUrl);
        navigate(target, { replace: true });
      } catch (err: any) {
        const status = err?.response?.status;
        let msg = err?.response?.data?.message || err?.message;

        if (status === 401 || !msg) {
          msg = 'Credenciais inválidas. Verifique seu e-mail e senha.';
        }

        setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
      } finally {
        setIsLoading(false);
      }
    },
    [email, location.state, navigate, password, refreshProfile, rememberMe, user]
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    errorMessage,
    setErrorMessage,
    showForgotModal,
    setShowForgotModal,
    handleGoogleLogin,
    handleLoginSubmit,
  };
};
