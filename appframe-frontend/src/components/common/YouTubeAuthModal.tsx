import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { mediaService } from '../../services/media.service';
import { toast } from 'sonner';

export interface YouTubeAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const YouTubeAuthModal: React.FC<YouTubeAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isExtensionDetected, setIsExtensionDetected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [status, setStatus] = useState<{
    configured: boolean;
    path: string | null;
    updatedAt: string | null;
  } | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const data = await mediaService.getYouTubeCookiesStatus();
      setStatus(data);
      return data;
    } catch {
      return null;
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  // Verifica a presença da extensão AppFrame Companion
  const checkExtension = useCallback(() => {
    const isInstalled =
      document.documentElement.getAttribute('data-appframe-companion-installed') === 'true' ||
      Boolean((window as any).__APPFRAME_COMPANION_INSTALLED__);

    if (isInstalled) {
      setIsExtensionDetected(true);
      return;
    }

    // Ping via postMessage
    const pingId = `ping_${Date.now()}`;
    const handlePong = (event: MessageEvent) => {
      if (
        event.source === window &&
        event.data?.type === 'APPFRAME_COMPANION_PONG' &&
        event.data?.requestId === pingId
      ) {
        setIsExtensionDetected(true);
        window.removeEventListener('message', handlePong);
      }
    };

    window.addEventListener('message', handlePong);
    window.postMessage({ type: 'APPFRAME_COMPANION_PING', requestId: pingId }, '*');

    // Timeout para remover listener caso não responda
    setTimeout(() => {
      window.removeEventListener('message', handlePong);
    }, 1200);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    loadStatus();
    checkExtension();

    // Escuta evento customizado disparado pelo content script caso injetado após o load
    const handleCompanionReady = () => {
      setIsExtensionDetected(true);
    };
    window.addEventListener('appframe:companion:ready', handleCompanionReady);

    // Polling a cada 2.5s para detectar sincronização realizada pelo popup da extensão
    pollTimerRef.current = setInterval(async () => {
      checkExtension();
      const current = await loadStatus();
      if (current?.configured) {
        toast.success('Sessão do YouTube detectada e conectada!');
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }
    }, 2500);

    return () => {
      window.removeEventListener('appframe:companion:ready', handleCompanionReady);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [isOpen, loadStatus, checkExtension, onSuccess, onClose]);

  if (!isOpen) return null;

  // Sincronização 1-clique via Extensão AppFrame Companion
  const handleSyncViaCompanion = async () => {
    setIsSyncing(true);
    const requestId = `sync_${Date.now()}`;

    const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) =>
      setTimeout(
        () =>
          resolve({
            success: false,
            error: 'Tempo esgotado aguardando resposta da extensão. Verifique se você está logado no YouTube.',
          }),
        10000,
      ),
    );

    const syncPromise = new Promise<{ success: boolean; cookies?: string; error?: string }>(
      (resolve) => {
        const handleResponse = (event: MessageEvent) => {
          if (
            event.source === window &&
            event.data?.type === 'APPFRAME_COMPANION_SYNC_RESPONSE' &&
            event.data?.requestId === requestId
          ) {
            window.removeEventListener('message', handleResponse);
            resolve(event.data);
          }
        };
        window.addEventListener('message', handleResponse);
        window.postMessage(
          {
            type: 'APPFRAME_COMPANION_SYNC_REQUEST',
            requestId,
          },
          '*',
        );
      },
    );

    try {
      const response = await Promise.race([syncPromise, timeoutPromise]);

      if (!response.success || !response.cookies) {
        throw new Error(response.error || 'Nenhum cookie de sessão foi retornado pela extensão.');
      }

      const res = await mediaService.saveYouTubeCookies(response.cookies);
      toast.success(res.message || 'Conta do YouTube conectada com sucesso!');
      await loadStatus();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao sincronizar com o YouTube.';
      toast.error(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteCookies = async () => {
    setIsDeleting(true);
    try {
      const res = await mediaService.deleteYouTubeCookies();
      toast.success(res.message || 'Sessão desconectada com sucesso.');
      await loadStatus();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao remover sessão.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 select-none">
      <Card className="w-full max-w-xl p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-surface-container-highest pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                smart_display
              </span>
            </div>
            <div className="flex flex-col">
              <h2 className="font-title-md text-title-md font-bold text-on-surface">
                AppFrame Companion • YouTube Sync
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Sincronização 1-clique para download de vídeos com restrição de idade (+18)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="text-neutral-400 hover:text-on-surface cursor-pointer p-1 rounded transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Status de Conexão Atual */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline/10">
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-on-surface-variant font-medium">
              Status da Conexão:
            </span>
            {isLoadingStatus ? (
              <Badge variant="neutral">Verificando...</Badge>
            ) : status?.configured ? (
              <Badge variant="status-completed">
                Conectado • Sessão Ativa (+18)
              </Badge>
            ) : (
              <Badge variant="neutral">
                Aguardando Sincronização
              </Badge>
            )}
          </div>

          {status?.configured && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteCookies}
              isLoading={isDeleting}
              className="text-error hover:text-error/80 text-[12px] h-7 px-2"
              leftIcon={<span className="material-symbols-outlined text-[14px]">delete</span>}
            >
              Desconectar Conta
            </Button>
          )}
        </div>

        {/* Se a extensão estiver detectada: Botão 1-Clique em destaque */}
        {isExtensionDetected ? (
          <div className="rounded-xl bg-primary/10 border border-primary/30 p-5 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px] animate-pulse">
                sync
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-title-sm font-bold text-on-surface">
                Extensão AppFrame Companion Detectada!
              </h3>
              <p className="text-body-sm text-on-surface-variant max-w-md">
                Certifique-se de que você está logado no YouTube neste navegador com sua conta (+18) e clique abaixo para sincronizar.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSyncViaCompanion}
              isLoading={isSyncing}
              leftIcon={
                <span className="material-symbols-outlined text-[20px]">
                  bolt
                </span>
              }
              className="mt-1 shadow-lg shadow-primary/20"
            >
              <span>Sincronizar YouTube Agora (1 Clique)</span>
            </Button>
          </div>
        ) : (
          /* Se a extensão ainda não estiver detectada */
          <div className="rounded-xl bg-surface-container-low border border-outline/10 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2.5 text-primary font-semibold text-body-md">
              <span className="material-symbols-outlined text-[22px]">extension</span>
              <span>Como sincronizar via AppFrame Companion:</span>
            </div>

            <ol className="list-decimal list-inside text-body-sm text-on-surface-variant flex flex-col gap-2 pl-1">
              <li>
                Instale a extensão oficial <strong>AppFrame Companion</strong> no seu navegador (Chrome, Edge, Brave ou Firefox).
              </li>
              <li>
                Abra o YouTube e certifique-se de estar conectado à sua conta (+18).
              </li>
              <li>
                Clique no ícone da extensão na barra do navegador e aperte <strong>"Sincronizar com AppFrame"</strong> (ou recarregue esta página).
              </li>
            </ol>

            {/* Toggle do Guia Rápido de Instalação */}
            <div className="pt-2 border-t border-outline/10">
              <button
                type="button"
                onClick={() => setShowInstallGuide(!showInstallGuide)}
                className="text-primary hover:text-primary/80 text-[12px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {showInstallGuide ? 'expand_less' : 'help_outline'}
                </span>
                <span>{showInstallGuide ? 'Ocultar passo a passo' : 'Como instalar a extensão em 30 segundos'}</span>
              </button>

              {showInstallGuide && (
                <div className="mt-2.5 p-3 rounded-lg bg-surface-container border border-outline/10 text-body-sm text-on-surface-variant flex flex-col gap-1.5 text-[12px]">
                  <p><strong>Chrome / Edge / Brave:</strong></p>
                  <p>1. Acesse <code>chrome://extensions</code> (ou <code>edge://extensions</code>).</p>
                  <p>2. Ative o <strong>"Modo do Desenvolvedor"</strong> no topo direito.</p>
                  <p>3. Clique em <strong>"Carregar sem compactação"</strong> e selecione a pasta <code>appframe-companion-extension</code>.</p>
                  <p className="mt-1"><strong>Firefox:</strong></p>
                  <p>Acesse <code>about:debugging#/runtime/this-firefox</code> e clique em <em>Carregar extensão temporária</em> selecionando o <code>manifest.json</code>.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rodapé e Ações */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-surface-container-highest">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              loadStatus();
              checkExtension();
            }}
            isLoading={isLoadingStatus}
            leftIcon={<span className="material-symbols-outlined text-[16px]">refresh</span>}
            className="text-[12px]"
          >
            Verificar Conexão
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSyncing}
          >
            Fechar
          </Button>
        </div>
      </Card>
    </div>
  );
};
