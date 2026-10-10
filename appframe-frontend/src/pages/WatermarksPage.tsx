import React, { useState, useRef } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

export interface WatermarkItem {
  id: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  isDefault?: boolean;
  createdAt: string;
}

const INITIAL_WATERMARKS: WatermarkItem[] = [
  {
    id: 'wm-1',
    originalName: 'appframe-logo-amber-alpha.png',
    storagePath: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="42" viewBox="0 0 160 42"><rect width="38" height="38" rx="10" fill="%23f2be5e"/><path d="M12 10h14v18H12z" fill="%2310131a"/><text x="48" y="27" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23f2be5e">AppFrame</text></svg>',
    mimeType: 'image/png',
    fileSizeBytes: 145408, // 142 KB
    width: 1080,
    height: 284,
    isDefault: true,
    createdAt: '09/10/2026',
  },
  {
    id: 'wm-2',
    originalName: 'appframe-white-minimal.png',
    storagePath: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="42" viewBox="0 0 160 42"><rect width="38" height="38" rx="10" fill="%23ffffff"/><path d="M12 10h14v18H12z" fill="%23000000"/><text x="48" y="27" font-family="sans-serif" font-weight="bold" font-size="16" fill="%23ffffff">AppFrame</text></svg>',
    mimeType: 'image/png',
    fileSizeBytes: 98304, // 96 KB
    width: 1080,
    height: 284,
    isDefault: false,
    createdAt: '08/10/2026',
  },
  {
    id: 'wm-3',
    originalName: 'podcast-pro-certified-badge.png',
    storagePath: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="42" viewBox="0 0 160 42"><rect width="160" height="40" rx="8" fill="%23d4a346"/><text x="16" y="26" font-family="sans-serif" font-weight="bold" font-size="13" fill="%2310131a">PODCAST PRO</text></svg>',
    mimeType: 'image/png',
    fileSizeBytes: 212992, // 208 KB
    width: 1280,
    height: 320,
    isDefault: false,
    createdAt: '05/10/2026',
  },
];

export const WatermarksPage: React.FC = () => {
  const { navigate } = useNavigation();
  const [watermarks, setWatermarks] = useState<WatermarkItem[]>(INITIAL_WATERMARKS);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1048576) {
      return `${(bytes / 1048576).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const processFile = (file: File) => {
    setErrorMessage(null);

    // Validação estrita de arquivo PNG com canal alfa
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      setErrorMessage('Formato inválido: apenas arquivos PNG com canal alfa transparente são suportados.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('O arquivo excede o limite máximo permitido de 10 MB.');
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const newWatermark: WatermarkItem = {
          id: `wm-${Date.now().toString(36)}`,
          originalName: file.name,
          storagePath: dataUrl,
          mimeType: 'image/png',
          fileSizeBytes: file.size,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
          isDefault: watermarks.length === 0,
          createdAt: new Date().toLocaleDateString('pt-BR'),
        };

        setWatermarks((prev) => [newWatermark, ...prev]);
        setIsUploading(false);
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleSetDefault = (id: string) => {
    setWatermarks((prev) =>
      prev.map((wm) => ({
        ...wm,
        isDefault: wm.id === id,
      }))
    );
  };

  const handleDelete = (id: string) => {
    setWatermarks((prev) => prev.filter((wm) => wm.id !== id));
    setDeleteConfirmId(null);
  };

  return (
    <AppShell
      currentPath="marcas-dagua"
      onNavigate={(path) => navigate(path)}
      userName="Christian"
      onUserAvatarClick={() => navigate('settings')}
    >
      <div className="flex flex-col w-full text-on-surface select-none pb-12">
        {/* ================= HEADER ================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-lg">
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm mb-1 flex-wrap">
              <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg font-bold text-on-surface tracking-tight">
                Gestão de Marcas d'Água
              </h1>
              <Badge variant="status-live">
                Canal Alfa Preservado
              </Badge>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Faça upload de PNGs transparentes para queima em 9 âncoras no Studio via matriz 3x3 do FFmpeg.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            {/* Alternador de Demonstração para Testar EmptyState */}
            <button
              type="button"
              onClick={() => {
                if (watermarks.length > 0) {
                  setWatermarks([]);
                } else {
                  setWatermarks(INITIAL_WATERMARKS);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-label-md font-label-md transition-all shadow-sm cursor-pointer border border-surface-container-highest/60"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">
                swap_horiz
              </span>
              <span>{watermarks.length > 0 ? 'Ver Estado Vazio' : 'Ver Estado Populado'}</span>
            </button>

            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  upload
                </span>
              }
            >
              Novo Upload
            </Button>
          </div>
        </header>

        {/* Input Oculto de Arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* ================= DROPZONE COM BORDA TRACEJADA ÂMBAR ================= */}
        <section className="mb-space-lg">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300',
              'border-2 border-dashed bg-surface-container-low/80 backdrop-blur-sm',
              isDragging
                ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(242,190,94,0.25)] scale-[1.01]'
                : 'border-primary/50 hover:border-primary hover:bg-surface-container-low shadow-[0_8px_24px_rgba(0,0,0,0.3)]'
            )}
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary mb-3 shadow-[0_0_20px_rgba(212,163,70,0.2)]">
              <span
                className={cn(
                  'material-symbols-outlined text-[34px]',
                  isUploading && 'animate-spin'
                )}
              >
                {isUploading ? 'sync' : 'cloud_upload'}
              </span>
            </div>

            <h3 className="font-title-md text-title-md font-bold text-on-surface mb-1">
              {isUploading ? 'Processando Imagem PNG...' : 'Arraste seu arquivo PNG transparente aqui'}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mb-3">
              Ou <span className="text-primary font-semibold underline">clique para selecionar do computador</span>. O canal alfa é preservado com precisão para queima em vídeo.
            </p>

            <div className="flex items-center gap-3 text-label-sm font-label-sm text-outline flex-wrap justify-center">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">check_circle</span>
                Formato estrito: PNG
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-primary">check_circle</span>
                Transparência nativa (Alpha channel)
              </span>
              <span>•</span>
              <span>Até 10 MB</span>
            </div>

            {/* Mensagem de Erro de Formato */}
            {errorMessage && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="mt-4 p-3 rounded-xl bg-error-container/40 border border-error/40 text-error text-body-sm font-body-sm flex items-center gap-2 animate-in fade-in"
              >
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </section>

        {/* ================= GRADE DE LOGOS SALVOS OU ESTADO VAZIO ================= */}
        {watermarks.length > 0 ? (
          <section className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <span className="font-title-sm text-title-sm font-bold text-on-surface">
                Marcas Cadastradas ({watermarks.length})
              </span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">
                O fundo xadrez valida o canal de transparência
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {watermarks.map((wm) => (
                <Card
                  key={wm.id}
                  className={cn(
                    'overflow-hidden bg-surface-container border transition-all duration-300 hover:-translate-y-1 shadow-lg flex flex-col',
                    wm.isDefault
                      ? 'border-primary/50 shadow-[0_0_15px_rgba(212,163,70,0.15)]'
                      : 'border-surface-container-high hover:border-outline/30'
                  )}
                >
                  {/* Fundo Xadrez (Checkerboard) para Testar Transparência do Canal Alfa */}
                  <div
                    className={cn(
                      'relative w-full h-44 flex items-center justify-center p-6 overflow-hidden',
                      // Padrão xadrez CSS profissional
                      'bg-[linear-gradient(45deg,#232732_25%,transparent_25%),linear-gradient(-45deg,#232732_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#232732_75%),linear-gradient(-45deg,transparent_75%,#232732_75%)]',
                      'bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-[#141720]'
                    )}
                  >
                    <img
                      src={wm.storagePath}
                      alt={wm.originalName}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform hover:scale-105"
                    />

                    {/* Badge de Padrão */}
                    {wm.isDefault && (
                      <div className="absolute top-2.5 left-2.5 bg-primary text-on-primary font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">star</span>
                        <span>Padrão Studio</span>
                      </div>
                    )}

                    <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-outline font-mono text-[10px] px-2 py-0.5 rounded-md uppercase">
                      PNG Alpha
                    </div>
                  </div>

                  {/* Informações e Metadados Tabulares */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-surface-container">
                    <div>
                      <h4
                        className="font-title-sm text-title-sm font-bold text-on-surface truncate"
                        title={wm.originalName}
                      >
                        {wm.originalName}
                      </h4>

                      {/* Metadados Tabulares */}
                      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-surface-container-highest/60 text-center font-mono tabular-nums">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-outline uppercase font-sans">Dimensões</span>
                          <span className="text-label-md font-bold text-on-surface">
                            {wm.width}×{wm.height}
                          </span>
                        </div>
                        <div className="flex flex-col border-x border-surface-container-highest/60">
                          <span className="text-[10px] text-outline uppercase font-sans">Tamanho</span>
                          <span className="text-label-md font-bold text-primary">
                            {formatFileSize(wm.fileSizeBytes)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-outline uppercase font-sans">Upload</span>
                          <span className="text-label-md font-bold text-on-surface-variant">
                            {wm.createdAt}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      {!wm.isDefault ? (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(wm.id)}
                          className="text-label-sm font-label-sm text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Tornar Padrão
                        </button>
                      ) : (
                        <span className="text-label-sm font-label-sm text-outline">
                          Logo Padrão
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(wm.id)}
                        className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                        title="Excluir marca d'água"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        ) : (
          /* ================= ESTADO VAZIO USANDO <EmptyState> ================= */
          <EmptyState
            icon="branding_watermark"
            title="Nenhuma marca d'água cadastrada no AppFrame"
            description="Faça upload do seu primeiro arquivo PNG com canal alfa transparente para aplicar logos personalizados sobre os vídeos no Studio."
            suggestionsTitle="Exemplos recomendados para teste rápido:"
            suggestions={[
              {
                label: 'Carregar Logo AppFrame Âmbar',
                onClick: () => setWatermarks(INITIAL_WATERMARKS),
              },
              {
                label: 'Carregar Badge Podcast Pro',
                onClick: () => setWatermarks([INITIAL_WATERMARKS[2]]),
              },
            ]}
          />
        )}

        {/* Modal de Confirmação de Exclusão */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-sm p-6 bg-surface-container border border-surface-container-high shadow-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-error-container/40 text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">delete_forever</span>
              </div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                Excluir Marca d'Água?
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Esta ação removerá o arquivo PNG permanentemente. Jobs que já foram renderizados não serão afetados.
              </p>
              <div className="flex items-center gap-2 w-full mt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => handleDelete(deleteConfirmId)}
                >
                  Excluir
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
};
