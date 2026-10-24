import React from "react";
import { Button } from "../../../components/ui";
import { cn } from "../../../lib/utils";
import type { AspectRatio } from "../types";

import { useStudioContext } from "../context";

export interface StudioHeaderProps {
  studioProjectTitle?: string;
  aspectRatio?: AspectRatio;
  setAspectRatio?: (ratio: AspectRatio) => void;
  videoQueueLength?: number;
  activeQueueIndex?: number;
  hasCurrentVideo?: boolean;
  isPreparingPreview?: boolean;
  previewStatus?: 'IDLE' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  isGenerating?: boolean;
  isStudioBusy?: boolean;
  renderProgress?: number;
  onNavigateBack?: () => void;
  onResetStudio?: () => void;
  onOpenDeleteModal?: () => void;
  onGenerateVideo?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = (props) => {
  const studio = useStudioContext();

  const studioProjectTitle =
    props.studioProjectTitle ?? studio.studioProjectTitle;
  const hasCurrentVideo = props.hasCurrentVideo ?? Boolean(studio.currentVideo);
  const isPreparingPreview =
    props.isPreparingPreview ?? studio.isPreparingPreview;
  const previewStatus =
    props.previewStatus ?? studio.previewStatus ?? 'IDLE';
  const isGenerating = props.isGenerating ?? studio.isGenerating;
  const isStudioBusy =
    props.isStudioBusy ??
    studio.isStudioBusy ??
    (isPreparingPreview ||
      previewStatus === 'PROCESSING' ||
      previewStatus === 'PENDING' ||
      isGenerating);
  const isActionBlocked = !hasCurrentVideo || isStudioBusy;

  const renderProgress = props.renderProgress ?? studio.renderProgress;
  const onNavigateBack =
    props.onNavigateBack ?? (() => studio.navigate("varredura"));
  const onResetStudio = props.onResetStudio ?? studio.handleResetStudio;
  const onOpenDeleteModal =
    props.onOpenDeleteModal ?? (() => studio.setIsDeleteStudioModalOpen(true));
  const onGenerateVideo = props.onGenerateVideo ?? studio.handleGenerateVideo;

  const handleResetClick = () => {
    if (isActionBlocked) return;
    onResetStudio();
  };

  const handleDeleteClick = () => {
    if (isActionBlocked) return;
    onOpenDeleteModal();
  };

  const handleGenerateClick = () => {
    if (isActionBlocked) {
      console.warn('Operação bloqueada: o Studio está ocupado processando.');
      return;
    }
    onGenerateVideo();
  };

  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-space-md p-3.5 rounded-2xl bg-white dark:bg-surface-container-low border border-neutral-200 dark:border-surface-container-high/80 shadow-sm">
      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={onNavigateBack}
          title="Voltar para Varredura"
          aria-label="Voltar para Varredura"
        >
          <span className="material-symbols-outlined text-[20px]">
            arrow_back
          </span>
        </Button>

        <div className="flex flex-col">
          <div className="flex items-center justify-start gap-2 flex-wrap">
            <span className="font-title-md text-title-md font-bold text-neutral-900 dark:text-on-surface line-clamp-1 max-w-md">
              {studioProjectTitle}
            </span>
          </div>
          <span className="text-label-sm font-label-sm text-neutral-500 dark:text-outline">
            Canvas 1080p
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 lg:self-end justify-center">
        {/* Botões de Ação do Studio */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Resetar: ícone no mobile, ícone + texto a partir de sm */}
          <Button
            variant="ghost"
            size="md"
            disabled={isActionBlocked}
            onClick={handleResetClick}
            title="Restaurar configurações para o padrão de fábrica"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                restart_alt
              </span>
            }
            className={cn(
              "text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface hover:bg-neutral-100 dark:hover:bg-surface-container-high cursor-pointer px-2 sm:px-3 shrink-0",
              isActionBlocked && "cursor-not-allowed opacity-50 pointer-events-none"
            )}
          >
            <span className="hidden sm:inline">Resetar</span>
          </Button>

          {/* Excluir: ícone no mobile, ícone + texto a partir de md (ou sm) */}
          <Button
            variant="ghost"
            size="md"
            disabled={isActionBlocked}
            onClick={handleDeleteClick}
            title="Remover vídeo e excluir arquivo temporário do Studio"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                delete_outline
              </span>
            }
            className={cn(
              "text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer px-2 sm:px-3 shrink-0",
              isActionBlocked && "cursor-not-allowed opacity-50 pointer-events-none"
            )}
          >
            <span className="hidden md:inline">Excluir do Studio</span>
            <span className="hidden sm:inline md:hidden">Excluir</span>
          </Button>

          {/* Botão de Ação Primária: "Gerar Vídeo" mantendo destaque */}
          <Button
            variant="primary"
            size="md"
            isLoading={isGenerating}
            disabled={isActionBlocked}
            onClick={handleGenerateClick}
            leftIcon={
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                movie_edit
              </span>
            }
            className={cn(
              "px-3 sm:px-5 text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(212,163,70,0.3)] cursor-pointer shrink-0",
              isActionBlocked && "cursor-not-allowed opacity-50 pointer-events-none"
            )}
          >
            <span>
              {isGenerating ? `Gerando (${renderProgress}%)...` : "Gerar Vídeo"}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};
