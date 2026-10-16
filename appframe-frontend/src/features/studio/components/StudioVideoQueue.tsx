import React from 'react';
import { Card } from '../../../components/ui/Card';
import { cn } from '../../../lib/utils';
import type { StudioVideoQueueItem } from '../../history';

interface StudioVideoQueueProps {
  videoQueue: StudioVideoQueueItem[];
  activeQueueIndex: number;
  completedVideoIds: string[];
  isGenerating: boolean;
  isPreparingPreview: boolean;
  onSelectVideo: (index: number) => void;
}

export const StudioVideoQueue: React.FC<StudioVideoQueueProps> = ({
  videoQueue,
  activeQueueIndex,
  completedVideoIds,
  isGenerating,
  isPreparingPreview,
  onSelectVideo,
}) => {
  if (videoQueue.length <= 1) return null;

  return (
    <Card className="mb-space-md p-3.5 bg-surface-container-low border border-surface-container-high/90 shadow-md">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-primary">
            queue_play_next
          </span>
          <span className="font-title-sm text-title-sm font-bold text-on-surface">
            Lista de Espera do Studio ({completedVideoIds.length}/{videoQueue.length} concluídos)
          </span>
        </div>
        <span className="text-label-sm text-on-surface-variant">
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
              disabled={isGenerating || isPreparingPreview}
              onClick={() => onSelectVideo(idx)}
              className={cn(
                'flex items-center gap-2.5 p-2 rounded-xl border text-left min-w-[240px] max-w-[290px] transition-all shrink-0 cursor-pointer',
                isCurrent
                  ? 'bg-primary/15 border-primary text-on-surface shadow-sm'
                  : isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-on-surface-variant'
                    : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface'
              )}
            >
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-12 h-8 rounded-lg object-cover shrink-0 bg-black"
                />
              ) : (
                <div className="w-12 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px] text-primary">
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
                    <span className="text-emerald-400">Concluído e Baixado</span>
                  ) : isCurrent ? (
                    <span className="text-primary">Em edição agora</span>
                  ) : (
                    <span className="text-outline">Aguardando na lista</span>
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
