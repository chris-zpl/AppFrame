import React from 'react';
import { Card } from '../../../components/ui/Card';
import { cn } from '../../../lib/utils';
import type { StudioVideoQueueItem } from '../../history';

import { useStudioContext } from '../context';

export interface StudioVideoQueueProps {
  videoQueue?: StudioVideoQueueItem[];
  activeQueueIndex?: number;
  completedVideoIds?: string[];
  isGenerating?: boolean;
  isPreparingPreview?: boolean;
  onSelectVideo?: (index: number) => void;
}

export const StudioVideoQueue: React.FC<StudioVideoQueueProps> = (props) => {
  const studio = useStudioContext();

  const videoQueue = props.videoQueue ?? studio.videoQueue;
  const activeQueueIndex = props.activeQueueIndex ?? studio.activeQueueIndex;
  const completedVideoIds = props.completedVideoIds ?? studio.completedVideoIds;
  const isGenerating = props.isGenerating ?? studio.isGenerating;
  const isPreparingPreview = props.isPreparingPreview ?? studio.isPreparingPreview;
  const onSelectVideo = props.onSelectVideo ?? studio.setActiveQueueIndex;

  if (videoQueue.length <= 1) return null;

  return (
    <Card className="mb-space-md p-3.5 bg-white dark:bg-surface-container-low border border-neutral-200 dark:border-surface-container-high/90 shadow-sm dark:shadow-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">
            queue_play_next
          </span>
          <span className="font-title-sm text-title-sm font-bold text-neutral-900 dark:text-on-surface">
            Lista de Espera do Studio ({completedVideoIds.length}/{videoQueue.length} concluídos)
          </span>
        </div>
        <span className="text-label-sm text-neutral-600 dark:text-on-surface-variant">
          Selecione um vídeo da lista ou gere o atual para avançar automaticamente
        </span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
        {videoQueue.map((item, idx) => {
          const isCurrent = idx === activeQueueIndex;
          const isDone = completedVideoIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              disabled={isGenerating}
              onClick={() => onSelectVideo(idx)}
              className={cn(
                'flex items-center gap-2.5 p-2 rounded-xl border text-left min-w-[240px] max-w-[290px] transition-all shrink-0 cursor-pointer',
                isCurrent
                  ? 'bg-amber-500/15 dark:bg-primary/15 border-amber-600/40 dark:border-primary text-neutral-900 dark:text-on-surface shadow-sm'
                  : isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-neutral-700 dark:text-on-surface-variant'
                    : 'bg-neutral-50 dark:bg-surface-container border-neutral-200 dark:border-surface-container-highest text-neutral-700 dark:text-on-surface-variant hover:text-neutral-900 dark:hover:text-on-surface'
              )}
            >
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-12 h-8 rounded-lg object-cover shrink-0 bg-black"
                />
              ) : (
                <div className="w-12 h-8 rounded-lg bg-neutral-200 dark:bg-surface-container-highest flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] text-amber-700 dark:text-primary">
                    movie
                  </span>
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-label-sm font-bold truncate">
                  {idx + 1}. {item.title}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {isDone ? (
                    <span className="text-emerald-700 dark:text-emerald-400">Concluído e Baixado</span>
                  ) : isCurrent ? (
                    <span className="text-amber-800 dark:text-primary">
                      {isPreparingPreview ? 'Baixando preview...' : 'Em edição agora'}
                    </span>
                  ) : (
                    <span className="text-neutral-500 dark:text-outline">Aguardando na lista</span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
