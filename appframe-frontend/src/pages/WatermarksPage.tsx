import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';
import { watermarksService } from '../services/watermarks.service';
import { toast } from 'sonner';

export const WatermarksPage: React.FC = () => {
  const { navigate } = useNavigation();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [defaultWatermarkId, setDefaultWatermarkId] = useState<string | null>(() => {
    return localStorage.getItem('appframe_default_watermark_id');
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Consulta real com TanStack Query
  const {
    data: watermarks = [],
    isLoading,
  } = useQuery({
    queryKey: ['watermarks'],
    queryFn: () => watermarksService.list(),
  });

  // Mutação real de upload Multipart/FormData
  const uploadMutation = useMutation({
    mutationFn: (file: File) => watermarksService.upload(file),
    onSuccess: (newWm) => {
      queryClient.invalidateQueries({ queryKey: ['watermarks'] });
      setErrorMessage(null);
      toast.success("Marca d'água enviada com sucesso!");
      if (!defaultWatermarkId) {
        setDefaultWatermarkId(newWm.id);
        localStorage.setItem('appframe_default_watermark_id', newWm.id);
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao fazer upload da marca d’água.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  // Mutação real de exclusão
  const deleteMutation = useMutation({
    mutationFn: (id: string) => watermarksService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watermarks'] });
      setDeleteConfirmId(null);
      toast.success("Marca d'água removida.");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao excluir a marca d’água.';
      setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 KB';
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

    uploadMutation.mutate(file);
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
      e.target.value = '';
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultWatermarkId(id);
    localStorage.setItem('appframe_default_watermark_id', id);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <AppShell
      currentPath="marcas-dagua"
      onNavigate={(path) => navigate(path)}
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
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  upload
                </span>
              }
            >
              {uploadMutation.isPending ? 'Enviando...' : 'Novo Upload'}
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
              'border-2 border-dashed bg-white dark:bg-surface-container-low/80 backdrop-blur-sm',
              isDragging
                ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(242,190,94,0.25)] scale-[1.01]'
                : 'border-primary/60 hover:border-primary hover:bg-neutral-50 dark:hover:bg-surface-container-low shadow-sm dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)]'
            )}
          >
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-surface-container-highest flex items-center justify-center text-primary mb-3 shadow-[0_0_20px_rgba(212,163,70,0.2)]">
              <span
                className={cn(
                  'material-symbols-outlined text-[34px]',
                  uploadMutation.isPending && 'animate-spin'
                )}
              >
                {uploadMutation.isPending ? 'sync' : 'cloud_upload'}
              </span>
            </div>

            <h3 className="font-title-md text-title-md font-bold text-on-surface mb-1">
              {uploadMutation.isPending
                ? 'Processando e salvando imagem PNG...'
                : 'Arraste seu arquivo PNG transparente aqui'}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mb-3">
              Suporta formato nativo PNG com fundo transparente para sobreposição exata nas bordas do vídeo.
            </p>

            <div className="flex items-center gap-3 text-label-sm font-label-sm text-outline">
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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Carregando marcas d'água...</span>
          </div>
        ) : watermarks.length > 0 ? (
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
              {watermarks.map((wm) => {
                const isDefault = defaultWatermarkId === wm.id;
                return (
                  <Card
                    key={wm.id}
                    className={cn(
                      'overflow-hidden bg-white dark:bg-surface-container border transition-all duration-300 hover:-translate-y-1 shadow-md dark:shadow-lg flex flex-col',
                      isDefault
                        ? 'border-primary/50 shadow-[0_0_15px_rgba(212,163,70,0.15)] ring-1 ring-primary/30'
                        : 'border-neutral-200 dark:border-surface-container-high hover:border-primary/40'
                    )}
                  >
                    {/* Fundo Xadrez (Checkerboard) para Testar Transparência do Canal Alfa */}
                    <div
                      className={cn(
                        'relative w-full h-44 flex items-center justify-center p-6 overflow-hidden',
                        'bg-[linear-gradient(45deg,#cbd5e1_25%,transparent_25%),linear-gradient(-45deg,#cbd5e1_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#cbd5e1_75%),linear-gradient(-45deg,transparent_75%,#cbd5e1_75%)]',
                        'dark:bg-[linear-gradient(45deg,#232732_25%,transparent_25%),linear-gradient(-45deg,#232732_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#232732_75%),linear-gradient(-45deg,transparent_75%,#232732_75%)]',
                        'bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0] bg-neutral-100 dark:bg-[#141720]'
                      )}
                    >
                      <img
                        src={wm.url || watermarksService.getFileUrl(wm.id)}
                        alt={wm.original_name}
                        className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform hover:scale-105"
                      />

                      {/* Badge de Padrão */}
                      {isDefault && (
                        <div className="absolute top-2.5 left-2.5 bg-primary text-on-primary font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">star</span>
                          <span>Padrão Studio</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-sm text-outline font-mono text-[10px] px-2 py-0.5 rounded-md uppercase text-neutral-200">
                        PNG Alpha
                      </div>
                    </div>

                    {/* Informações e Metadados Tabulares */}
                    <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-white dark:bg-surface-container">
                      <div>
                        <h4
                          className="font-title-sm text-title-sm font-bold text-on-surface truncate"
                          title={wm.original_name}
                        >
                          {wm.original_name}
                        </h4>

                        {/* Metadados Tabulares */}
                        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-200 dark:border-surface-container-highest/60 text-center font-mono tabular-nums">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-outline uppercase font-sans">Tamanho</span>
                            <span className="text-label-md font-bold text-primary">
                              {formatFileSize(wm.file_size)}
                            </span>
                          </div>
                          <div className="flex flex-col border-l border-neutral-200 dark:border-surface-container-highest/60">
                            <span className="text-[10px] text-outline uppercase font-sans">Data</span>
                            <span className="text-label-md font-bold text-on-surface-variant">
                              {new Date(wm.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-between gap-2 pt-2">
                        {!isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(wm.id)}
                            className="text-label-sm font-label-sm text-primary hover:underline font-semibold cursor-pointer"
                          >
                            Tornar Padrão
                          </button>
                        ) : (
                          <span className="text-label-sm font-label-sm text-primary font-medium">
                            Logo Ativo
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(wm.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Excluir marca d'água"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : (
          /* ================= ESTADO VAZIO USANDO <EmptyState> ================= */
          <EmptyState
            icon="branding_watermark"
            title="Nenhuma marca d'água cadastrada no AppFrame"
            description="Faça upload do seu primeiro arquivo PNG com canal alfa transparente para aplicar logos personalizados sobre os vídeos no Studio."
            suggestionsTitle="Dica rápida para começar:"
            suggestions={[
              {
                label: 'Fazer upload de PNG transparente',
                onClick: () => fileInputRef.current?.click(),
              },
            ]}
          />
        )}

        {/* Modal de Confirmação de Exclusão */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <Card className="w-full max-w-sm p-6 bg-white dark:bg-surface-container border border-neutral-200 dark:border-surface-container-high shadow-2xl flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-error-container/40 text-error flex items-center justify-center">
                <span className="material-symbols-outlined text-[26px]">delete_forever</span>
              </div>
              <h3 className="font-title-md text-title-md font-bold text-on-surface">
                Excluir Marca d'Água?
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Esta ação removerá o arquivo PNG permanentemente do backend. Jobs já renderizados não serão afetados.
              </p>
              <div className="flex items-center gap-2 w-full mt-2">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={deleteMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                  onClick={() => handleDelete(deleteConfirmId)}
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
};
