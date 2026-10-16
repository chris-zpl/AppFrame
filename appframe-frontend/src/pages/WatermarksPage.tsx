import React, { useState, useRef } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  WatermarkUploadDropzone,
  WatermarkGrid,
  useWatermarks,
} from '../features/watermarks';

export const WatermarksPage: React.FC = () => {
  const { navigate } = useNavigation();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    watermarks,
    isLoading,
    errorMessage,
    deleteConfirmId,
    setDeleteConfirmId,
    defaultWatermarkId,
    handleSelectDefault,
    uploadFile,
    deleteWatermark,
    isUploading,
    isDeleting,
  } = useWatermarks();

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
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
      e.target.value = '';
    }
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
              disabled={isUploading}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  upload
                </span>
              }
            >
              {isUploading ? 'Enviando...' : 'Novo Upload'}
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
          isPending={isUploading}
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
            onSetDefault={handleSelectDefault}
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
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  disabled={isDeleting}
                  onClick={() => deleteWatermark(deleteConfirmId)}
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
};
