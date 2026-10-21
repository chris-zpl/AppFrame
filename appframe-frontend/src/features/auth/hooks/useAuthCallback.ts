import { useEffect, useState, useRef } from 'react';
import { useNavigation } from '../../../contexts/NavigationContext';
import { useAuth } from '../context';
import { getAuthRedirectTarget } from '../utils';

export interface UseAuthCallbackReturn {
  statusText: string;
  error: string | null;
  progress: number;
  handleBackToLogin: () => void;
}

export const useAuthCallback = (): UseAuthCallbackReturn => {
  const { navigate } = useNavigation();
  const { handleOAuthCallback } = useAuth();
  const [statusText, setStatusText] = useState('Capturando credenciais do Google OAuth...');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(25);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const processCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const token =
          urlParams.get('token') ||
          urlParams.get('access_token') ||
          hashParams.get('token') ||
          hashParams.get('access_token');
        const refreshToken =
          urlParams.get('refreshToken') ||
          urlParams.get('refresh_token') ||
          hashParams.get('refreshToken') ||
          hashParams.get('refresh_token');
        const requires2fa =
          urlParams.get('requires2fa') === 'true' || hashParams.get('requires2fa') === 'true';
        const tempToken = urlParams.get('tempToken') || hashParams.get('tempToken');
        const errParam = urlParams.get('error') || hashParams.get('error');
        const rememberMe =
          urlParams.get('rememberMe') === 'true' ||
          hashParams.get('rememberMe') === 'true' ||
          localStorage.getItem('appframe_remember_me') === 'true';

        if (errParam) {
          throw new Error(
            decodeURIComponent(errParam) || 'Autenticação cancelada ou rejeitada pelo Google.',
          );
        }

        // Se o usuário possui 2FA ativo na conta vinculada
        if (requires2fa && tempToken) {
          setStatusText('Desafio de Dois Fatores (2FA) detectado...');
          setProgress(75);
          setTimeout(() => {
            navigate('2fa', { tempToken, rememberMe });
          }, 400);
          return;
        }

        // Processa o token recebido ou cookies HttpOnly
        setStatusText('Validando sessão segura com o AppFrame...');
        setProgress(50);

        try {
          if (token) {
            await handleOAuthCallback(token, refreshToken || undefined, rememberMe);
          } else {
            await handleOAuthCallback(undefined, undefined, rememberMe);
          }
        } catch {
          throw new Error('Falha ao autenticar sessão com o Google. Tente novamente.');
        }

        setStatusText('Sessão estabelecida! Redirecionando para o Workspace...');
        setProgress(100);

        const target = getAuthRedirectTarget(null);

        setTimeout(() => {
          navigate(target, { replace: true });
        }, 300);
      } catch (err: any) {
        setError(err.message || 'Falha ao autenticar sessão com o Google. Tente novamente.');
      }
    };

    processCallback();
  }, [navigate, handleOAuthCallback]);

  const handleBackToLogin = () => {
    navigate('login');
  };

  return {
    statusText,
    error,
    progress,
    handleBackToLogin,
  };
};
