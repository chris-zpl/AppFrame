import React from 'react';
import { Badge, Button } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import type { AspectRatio } from '../interfaces';

import { useStudioContext } from '../context';

export interface StudioHeaderProps {
  studioProjectTitle?: string;
  aspectRatio?: AspectRatio;
  setAspectRatio?: (ratio: AspectRatio) => void;
  videoQueueLength?: number;
  activeQueueIndex?: number;
  hasCurrentVideo?: boolean;
  isPreparingPreview?: boolean;
  isGenerating?: boolean;
  renderProgress?: number;
  onNavigateBack?: () => void;
  onResetStudio?: () => void;
  onOpenDeleteModal?: () => void;
  onGenerateVideo?: () => void;
}

export const StudioHeader: React.FC<StudioHeaderProps> = (props) => {
  const studio = useStudioContext();

  const studioProjectTitle = props.studioProjectTitle ?? studio.studioProjectTitle;
  const aspectRatio = props.aspectRatio ?? studio.aspectRatio;
  const setAspectRatio = props.setAspectRatio ?? studio.setAspectRatio;
  const videoQueueLength = props.videoQueueLength ?? studio.videoQueue.length;
  const activeQueueIndex = props.activeQueueIndex ?? studio.activeQueueIndex;
  const hasCurrentVideo = props.hasCurrentVideo ?? Boolean(studio.currentVideo);
  const isPreparingPreview = props.isPreparingPreview ?? studio.isPreparingPreview;
  const isGenerating = props.isGenerating ?? studio.isGenerating;
  const renderProgress = props.renderProgress ?? studio.renderProgress;
  const onNavigateBack = props.onNavigateBack ?? (() => studio.navigate('varredura'));
  const onResetStudio = props.onResetStudio ?? studio.handleResetStudio;
  const onOpenDeleteModal = props.onOpenDeleteModal ?? (() => studio.setIsDeleteStudioModalOpen(true));
  const onGenerateVideo = props.onGenerateVideo ?? studio.handleGenerateVideo;
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-md p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNavigateBack}
          className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer border border-outline/10"
          title="Voltar para Varredura"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-title-md text-title-md font-bold text-on-surface line-clamp-1 max-w-md">
              {studioProjectTitle}
            </span>
            <Badge variant={aspectRatio === '9:16' ? 'short' : 'long'}>
              {aspectRatio === '9:16' ? '9:16 Shorts' : '16:9 Widescreen'}
            </Badge>
            {videoQueueLength > 1 && (
              <Badge variant="neutral">
                Fila: {activeQueueIndex + 1} de {videoQueueLength}
              </Badge>
            )}
          </div>
          <span className="text-label-sm font-label-sm text-outline">
            Canvas 1080p • FFmpeg Hardware Acceleration Ativo
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5 self-end md:self-auto">
        {/* Alternador de Aspecto entre 9:16 e 16:9 */}
        <div className="flex items-center p-1 rounded-xl bg-surface-container border border-surface-container-highest">
          <button
            type="button"
            onClick={() => setAspectRatio('9:16')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer',
              aspectRatio === '9:16'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
            title="Formato Vertical 9:16 (Shorts/Reels/TikTok)"
          >
            <span className="material-symbols-outlined text-[16px]">stay_current_portrait</span>
            <span>9:16</span>
          </button>
          <button
            type="button"
            onClick={() => setAspectRatio('16:9')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer',
              aspectRatio === '16:9'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
            title="Formato Horizontal 16:9 (YouTube Widescreen)"
          >
            <span className="material-symbols-outlined text-[16px]">stay_current_landscape</span>
            <span>16:9</span>
          </button>
        </div>

        {/* Botões de Ação do Studio */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="md"
            disabled={!hasCurrentVideo || isPreparingPreview || isGenerating}
            onClick={onResetStudio}
            title="Restaurar configurações para o padrão de fábrica"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                restart_alt
              </span>
            }
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer"
          >
            <span>Resetar</span>
          </Button>

          <Button
            variant="ghost"
            size="md"
            disabled={!hasCurrentVideo || isPreparingPreview || isGenerating}
            onClick={onOpenDeleteModal}
            title="Remover vídeo e excluir arquivo temporário do Studio"
            leftIcon={
              <span className="material-symbols-outlined text-[18px]">
                delete_outline
              </span>
            }
            className="text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
          >
            <span>Excluir do Studio</span>
          </Button>

          {/* Botão de Ação Primária: "Gerar Vídeo" */}
          <Button
            variant="primary"
            size="md"
            isLoading={isGenerating}
            disabled={!hasCurrentVideo || isPreparingPreview || isGenerating}
            onClick={onGenerateVideo}
            leftIcon={
              <span className="material-symbols-outlined text-[20px]">
                movie_edit
              </span>
            }
            className="px-5 font-bold shadow-[0_0_15px_rgba(212,163,70,0.3)] cursor-pointer"
          >
            <span>
              {isGenerating
                ? `Gerando (${renderProgress}%)...`
                : 'Gerar Vídeo'}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};
