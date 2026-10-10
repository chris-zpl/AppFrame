import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

export interface BatchDockProps {
  visible: boolean;
  selectedCount: number;
  totalDurationFormatted?: string;
  onClearSelection: () => void;
  onDownloadSelected?: () => void;
  onOpenStudio?: () => void;
  primaryActionLabel?: string;
  isDownloading?: boolean;
  className?: string;
}

export const BatchDock: React.FC<BatchDockProps> = ({
  visible,
  selectedCount,
  totalDurationFormatted,
  onClearSelection,
  onDownloadSelected,
  onOpenStudio,
  primaryActionLabel = 'Abrir no Studio',
  isDownloading = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 md:px-margin transition-all duration-300',
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-6 pointer-events-none',
        className,
      )}
    >
      <div className="w-full backdrop-blur-xl bg-surface-container-high/95 border border-primary/35 rounded-2xl p-3 md:px-space-md md:py-3 shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_20px_rgba(212,163,70,0.12)] flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Sumário de seleção */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shadow-inner shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                playlist_add_check
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-title-sm text-title-sm font-bold text-on-surface">
                  {selectedCount} {selectedCount === 1 ? 'vídeo selecionado' : 'vídeos selecionados'}
                </span>
                <span className="text-outline text-body-sm font-body-sm hidden xs:inline">
                  no AppFrame
                </span>
              </div>
              {totalDurationFormatted && (
                <div className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant">
                  <span>Duração acumulada:</span>
                  <span className="font-mono text-primary font-semibold">
                    {totalDurationFormatted}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClearSelection}
            className="sm:hidden text-label-sm font-label-sm text-outline hover:text-on-surface underline shrink-0 cursor-pointer"
          >
            Desmarcar
          </button>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onClearSelection}
            className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-title-sm font-title-sm transition-colors cursor-pointer"
          >
            Desmarcar todos
          </button>

          {onDownloadSelected && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={isDownloading}
              onClick={onDownloadSelected}
              className="px-3.5 py-2 h-10 rounded-xl"
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  download
                </span>
              }
            >
              <span className="hidden md:inline">Baixar Selecionados</span>
              <span className="md:hidden">Baixar</span>
            </Button>
          )}

          {onOpenStudio && (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenStudio}
              className="px-5 py-2.5 h-10 rounded-xl"
              leftIcon={
                <span className="material-symbols-outlined text-[18px]">
                  content_cut
                </span>
              }
            >
              <span>{primaryActionLabel}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
