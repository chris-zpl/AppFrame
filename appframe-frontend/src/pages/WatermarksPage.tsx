import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { toast } from 'sonner';
import {
  watermarksService,
  WatermarkUploadDropzone,
  WatermarkGrid,
} from '../features/watermarks';

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

  const processFile = (file: File) => {
    setErrorMessage(null);

    // Validação estrita de arquivo PNG com canal alfa
    if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
      setErrorMessage('Formato inválido: apenas arquivos PNG com canal alfa transparente são suportados.');
      return;
    }

    // Limite de 10 MB
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Arquivo muito grande: o tamanho máximo permitido é 10 MB.');
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultWatermarkId(id);
    localStorage.setItem('appframe_default_watermark_id', id);
    toast.success('Marca d’água padrão para novos cortes atualizada.');
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
      <div className="flex flex-col w-full text-on-surface pb-12">
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

        {/* DROPZONE */}
        <WatermarkUploadDropzone
          isDragging={isDragging}
          isPending={uploadMutation.isPending}
          errorMessage={errorMessage}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        />

        {/* GRADE DE LOGOS SALVOS OU ESTADO VAZIO */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-on-surface-variant text-sm">Carregando marcas d'água...</span>
          </div>
        ) : watermarks.length > 0 ? (
          <WatermarkGrid
            watermarks={watermarks}
            defaultWatermarkId={defaultWatermarkId}
            onSetDefault={handleSetDefault}
            onConfirmDelete={(id) => setDeleteConfirmId(id)}
          />
        ) : (
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
