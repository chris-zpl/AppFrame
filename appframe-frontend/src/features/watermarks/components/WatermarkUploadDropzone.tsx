import React from 'react';
import { cn } from '../../../lib/utils';

export interface WatermarkUploadDropzoneProps {
  isDragging: boolean;
  isPending: boolean;
  errorMessage: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  fileInputRef?: React.RefObject<HTMLInputElement | null>;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WatermarkUploadDropzone: React.FC<WatermarkUploadDropzoneProps> = ({
  isDragging,
  isPending,
  errorMessage,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  fileInputRef,
  onFileChange,
}) => {
  return (
    <section className="mb-space-lg">
      {fileInputRef && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          onChange={onFileChange}
          className="hidden"
        />
      )}

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
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
              isPending && 'animate-spin'
            )}
          >
            {isPending ? 'sync' : 'cloud_upload'}
          </span>
        </div>

        <h3 className="font-title-md text-title-md font-bold text-on-surface mb-1">
          {isPending
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
  );
};
