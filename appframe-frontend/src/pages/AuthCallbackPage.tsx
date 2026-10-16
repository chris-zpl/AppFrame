import React, { useEffect, useState, useRef } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { getAuthRedirectTarget } from '../features/auth';
import { AppFrameLogo } from '../components/common/AppFrameLogo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const AuthCallbackPage: React.FC = () => {
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

        const token = urlParams.get('token') || urlParams.get('access_token') || hashParams.get('token') || hashParams.get('access_token');
        const refreshToken = urlParams.get('refreshToken') || urlParams.get('refresh_token') || hashParams.get('refreshToken') || hashParams.get('refresh_token');
        const requires2fa = urlParams.get('requires2fa') === 'true' || hashParams.get('requires2fa') === 'true';
        const tempToken = urlParams.get('tempToken') || hashParams.get('tempToken');
        const errParam = urlParams.get('error') || hashParams.get('error');

        if (errParam) {
          throw new Error(decodeURIComponent(errParam) || 'Autenticação cancelada ou rejeitada pelo Google.');
        }

        // Se o usuário possui 2FA ativo na conta vinculada
        if (requires2fa && tempToken) {
          setStatusText('Desafio de Dois Fatores (2FA) detectado...');
          setProgress(75);
          setTimeout(() => {
            navigate(`/2fa?tempToken=${encodeURIComponent(tempToken)}`, { replace: true });
          }, 400);
          return;
        }

        // Processa o token recebido
        setStatusText('Validando sessão segura com o AppFrame...');
        setProgress(50);

        if (token) {
          await handleOAuthCallback(token, refreshToken || undefined);
        } else {
          throw new Error('Nenhum token retornado pelo provedor de autenticação.');
        }

        setStatusText('Sessão estabelecida! Redirecionando para o Workspace...');
        setProgress(100);

        const target = getAuthRedirectTarget(null);

        setTimeout(() => {
          navigate(target, { replace: true });
        }, 300);
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro ao sincronizar a conta do Google.');
      }
    };

    processCallback();
  }, [navigate, handleOAuthCallback]);

  return (
    <div className="min-h-screen w-full bg-surface text-on-surface flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Botão Fixo de Alternância de Tema */}
      <ThemeToggle variant="auth" className="fixed top-6 right-6 z-50" />

      {/* Halos Luminosos Ambientais */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-secondary-container/20 rounded-full blur-[100px] pointer-events-none" />

      <Card
        variant="elevated"
        className="w-full max-w-md p-8 text-center flex flex-col items-center relative z-10 border border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-6">
          <AppFrameLogo size="lg" glow />
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-error-container/40 border border-error/40 text-error flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">
                warning
              </span>
            </div>
            <h2 className="font-title-md text-title-md font-bold text-neutral-900 dark:text-[#F8F9FA]">
              Falha na Autenticação
            </h2>
            <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF] max-w-xs">
              {error}
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('login')}
              className="mt-2 w-full"
            >
              Voltar para o Login
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full gap-4">
            {/* Loader Âmbar Estilizado */}
            <div className="relative w-20 h-20 flex items-center justify-center my-2">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <div
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(242,190,94,0.3)] animate-pulse"
              >
                <span className="material-symbols-outlined text-[24px]">
                  lock_open
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <h2 className="font-headline-sm text-headline-sm font-bold text-neutral-900 dark:text-[#F8F9FA]">
                Autenticando Conta Google
              </h2>
              <p className="font-body-sm text-body-sm text-neutral-600 dark:text-[#949DAF]">
                {statusText}
              </p>
            </div>

            {/* Barra de Progresso Âmbar */}
            <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="font-label-sm text-label-sm text-neutral-500 dark:text-[#949DAF] mt-1">
              Aguarde a validação do token OAuth 2.0...
            </span>
          </div>
        )}
      </Card>
    </div>
  );
};
