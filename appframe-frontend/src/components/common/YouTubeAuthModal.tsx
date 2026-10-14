import React, { useState, useEffect, useRef } from 'react';
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
  const [cookiesText, setCookiesText] = useState('');
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [status, setStatus] = useState<{
    configured: boolean;
    path: string | null;
    updatedAt: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const data = await mediaService.getYouTubeCookiesStatus();
      setStatus(data);
    } catch {
      // Ignora erro de status
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setCookiesText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCookiesText(content);
        toast.info(`Arquivo "${file.name}" carregado. Clique em "Salvar e Autenticar".`);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCookies = async () => {
    if (!cookiesText.trim()) {
      toast.error('Cole o conteúdo dos cookies ou selecione um arquivo cookies.txt.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await mediaService.saveYouTubeCookies(cookiesText);
      toast.success(res.message || 'Cookies do YouTube salvos! Bypass de autenticação ativo.');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao salvar cookies.';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCookies = async () => {
    setIsDeleting(true);
    try {
      const res = await mediaService.deleteYouTubeCookies();
      toast.success(res.message || 'Cookies removidos com sucesso.');
      await loadStatus();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao remover cookies.';
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
                Login no YouTube (Autenticação)
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Bypass de restrição de idade (+18) e verificação anti-bot via cookies
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="text-neutral-400 hover:text-on-surface cursor-pointer p-1 rounded transition-colors disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Status de Autenticação Atual */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline/10">
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-on-surface-variant font-medium">
              Status da Conexão:
            </span>
            {isLoadingStatus ? (
              <Badge variant="neutral">Verificando...</Badge>
            ) : status?.configured ? (
              <Badge variant="status-completed">
                Conectado • Cookies Ativos
              </Badge>
            ) : (
              <Badge variant="status-processing">
                Não autenticado
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
              Remover Cookies
            </Button>
          )}
        </div>

        {/* Guia Rápido */}
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-body-sm">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <span>Como obter os cookies em 30 segundos (Passo a Passo):</span>
          </div>
          <ol className="list-decimal list-inside text-body-sm text-on-surface-variant flex flex-col gap-1 pl-1">
            <li>
              Instale a extensão gratuita{' '}
              <a
                href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline hover:text-primary/80 font-medium"
              >
                Get cookies.txt LOCALLY
              </a>{' '}
              (Chrome, Edge, Brave ou Firefox).
            </li>
            <li>Abra o YouTube no seu navegador logado em uma conta com idade confirmada (+18).</li>
            <li>Abra a extensão, copie os cookies (ou baixe o arquivo <code>cookies.txt</code>) e cole abaixo.</li>
          </ol>
        </div>

        {/* Campo de Entrada de Cookies */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-label-md font-medium text-on-surface">
              Conteúdo dos Cookies (formato Netscape ou JSON):
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-primary hover:text-primary/80 text-label-sm font-medium flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>Carregar arquivo cookies.txt</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.json"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>

          <textarea
            value={cookiesText}
            onChange={(e) => setCookiesText(e.target.value)}
            disabled={isSaving}
            placeholder="# Netscape HTTP Cookie File&#10;.youtube.com	TRUE	/	TRUE	1800000000	LOGIN_INFO	...&#10;&#10;Ou cole o arquivo/JSON exportado da sua conta aqui."
            className="w-full h-32 p-3 font-mono text-[12px] bg-surface-container-low border border-neutral-200 dark:border-surface-container-high rounded-xl text-on-surface placeholder:text-outline outline-none focus:border-primary/50 transition-colors resize-none disabled:opacity-50"
          />
          <span className="text-[11px] text-outline">
            {cookiesText ? `${cookiesText.length} caracteres inseridos` : 'Nenhum cookie inserido ainda.'}
          </span>
        </div>

        {/* Rodapé e Ações */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-surface-container-highest">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleSaveCookies}
            isLoading={isSaving}
            disabled={!cookiesText.trim()}
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                vpn_key
              </span>
            }
          >
            <span>Salvar e Autenticar</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};
