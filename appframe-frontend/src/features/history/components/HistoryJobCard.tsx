import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { cn } from '../../../lib/utils';
import type { VideoJobItem } from '../interfaces';
import { formatDuration, getThumbnailUrl } from '../constants';

interface HistoryJobCardProps {
  job: VideoJobItem;
  deletingJobId: string | null;
  onDownload: (job: VideoJobItem) => void;
  onViewError: (job: VideoJobItem) => void;
  onDelete: (job: VideoJobItem) => void;
}

export const HistoryJobCard: React.FC<HistoryJobCardProps> = ({
  job,
  deletingJobId,
  onDownload,
  onViewError,
  onDelete,
}) => {
  const st = String(job.status || '').toUpperCase();
  const isRendering = st === 'RENDERING';
  const isDownloading = st === 'DOWNLOADING';
  const isPending = st === 'PENDING';
  const isCompleted = st === 'COMPLETED';
  const isFailed = st === 'FAILED';

  const title = job.original_title || job.source_url || `Job ${job.id.substring(0, 8)}`;
  const queueLabel = isDownloading || isPending ? 'media-download' : 'media-render';
  const thumbUrl = getThumbnailUrl(job);

  return (
    <Card
      key={job.id}
      className={cn(
        'p-4 sm:p-5 bg-white dark:bg-surface-container-low border transition-all duration-200 shadow-sm dark:shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4',
        isRendering && 'border-primary/40 shadow-[0_0_15px_rgba(212,163,70,0.1)]',
        isCompleted && 'border-neutral-200 dark:border-surface-container-high hover:border-primary/30',
        isFailed && 'border-red-400/40 bg-red-500/5'
      )}
    >
      {/* Informações Primárias do Vídeo com Thumbnail Real */}
      <div className="flex items-start sm:items-center gap-4 flex-1 w-full">
        <div className="relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-surface-container-highest shrink-0 flex items-center justify-center shadow-xs">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div
              className={cn(
                'w-full h-full flex items-center justify-center',
                isCompleted && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
                (isRendering || isDownloading) && 'bg-primary/15 text-primary',
                isPending && 'bg-neutral-100 dark:bg-surface-container-highest text-neutral-500',
                isFailed && 'bg-red-500/20 text-red-600 dark:text-red-400'
              )}
            >
              <span className="material-symbols-outlined text-[24px]">
                {isCompleted && 'check_circle'}
                {isRendering && 'movie_filter'}
                {isDownloading && 'cloud_download'}
                {isPending && 'hourglass_empty'}
                {isFailed && 'error'}
              </span>
            </div>
          )}

          {/* Duração sobreposta na thumb */}
          <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/75 backdrop-blur-xs font-mono text-[9px] text-white tabular-nums">
            {formatDuration(job)}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-title-md text-title-md font-bold text-on-surface truncate max-w-xl" title={title}>
              {title}
            </h3>
            <Badge variant={job.aspect_ratio === '9:16' || job.platform?.includes('shorts') ? 'short' : 'long'}>
              {job.aspect_ratio
                ? job.aspect_ratio === '9:16'
                  ? '9:16 Shorts'
                  : '16:9 Widescreen'
                : job.platform?.includes('shorts')
                  ? '9:16 Shorts'
                  : '16:9 Widescreen'}
            </Badge>
          </div>

          {/* Metadados e Fila */}
          <div className="flex items-center gap-2 text-body-sm text-body-sm text-on-surface-variant flex-wrap font-mono tabular-nums">
            <span>Duração: <strong className="text-on-surface">{formatDuration(job)}</strong></span>
            <span className="text-outline">•</span>
            <span className="text-primary font-semibold font-sans">{queueLabel}</span>
            <span className="text-outline">•</span>
            <span>{new Date(job.created_at).toLocaleTimeString('pt-BR')}</span>
            <span className="text-outline">•</span>
            <span className="text-outline text-[11px] truncate max-w-[120px]">{job.id}</span>
          </div>

          {/* Barra de Progresso Linear Âmbar em Renderização */}
          {(isRendering || isDownloading) && (
            <div className="flex items-center gap-3 w-full max-w-md mt-1">
              <div className="w-full bg-neutral-200 dark:bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-amber-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(8, job.progress)}%` }}
                />
              </div>
              <span className="font-mono text-label-md font-bold text-primary tabular-nums shrink-0">
                {job.progress}%
              </span>
            </div>
          )}

          {/* Aviso de erro sanitizado */}
          {isFailed && job.error_log && (
            <div className="mt-1 text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">info</span>
              <span className="truncate max-w-md">{job.error_log}</span>
            </div>
          )}
        </div>
      </div>

      {/* Badges de Status e Ações */}
      <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
        {isPending && (
          <Badge variant="status-processing">
            Na Fila
          </Badge>
        )}

        {isDownloading && (
          <Badge variant="status-processing">
            Baixando
          </Badge>
        )}

        {isRendering && (
          <Badge variant="status-processing">
            Renderizando FFmpeg
          </Badge>
        )}

        {isCompleted && (
          <Badge variant="status-completed">
            Concluído
          </Badge>
        )}

        {isFailed && (
          <Badge variant="status-failed">
            Falha
          </Badge>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          {isCompleted && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDownload(job)}
              leftIcon={
                <span className="material-symbols-outlined text-[16px]">
                  download
                </span>
              }
            >
              Baixar Vídeo
            </Button>
          )}

          {isFailed && job.error_log && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewError(job)}
              leftIcon={
                <span className="material-symbols-outlined text-[16px]">
                  visibility
                </span>
              }
            >
              Ver Log
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            disabled={deletingJobId === job.id}
            onClick={() => onDelete(job)}
            title="Excluir do histórico"
            className="text-red-600 dark:text-red-400 hover:bg-red-500/10 px-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              delete
            </span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
