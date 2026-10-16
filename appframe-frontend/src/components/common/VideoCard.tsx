import React from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { Checkbox } from '../ui/Checkbox';

export interface VideoCardData {
  id: string;
  title: string;
  thumbnailUrl: string;
  durationFormatted: string;
  durationSeconds: number;
  isShort?: boolean;
  publishedText?: string;
  viewsText?: string;
  isTargetVideo?: boolean;
}

export interface VideoCardProps {
  video: VideoCardData;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onClick?: (video: VideoCardData) => void;
  className?: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isSelected = false,
  onToggleSelect,
  onClick,
  className,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    // Se o clique veio diretamente do checkbox, apenas alterna seleção
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    if (onToggleSelect) {
      onToggleSelect(video.id);
    } else if (onClick) {
      onClick(video);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative flex flex-col rounded-2xl bg-surface-container overflow-hidden',
        'transition-all duration-300 hover:-translate-y-1 shadow-[0_8px_24px_rgba(0,0,0,0.25)]',
        'hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)] cursor-pointer border border-outline/10',
        isSelected && 'ring-1 ring-primary/40 shadow-[0_8px_24px_rgba(212,163,70,0.15)]',
        className,
      )}
    >
      {/* Container de Thumbnail 16:9 */}
      <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradiente de proteção para textos */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent pointer-events-none" />

        {/* Checkbox Indicador no Topo Esquerdo */}
        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            variant="card-indicator"
            checked={isSelected}
            onChange={() => onToggleSelect && onToggleSelect(video.id)}
            aria-label={`Selecionar ${video.title}`}
          />
        </div>

        {/* Tag Shorts / Vídeo / Alvo no Topo Direito */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          {video.isTargetVideo && (
            <Badge variant="status-live" className="text-[11px] py-0.5 px-2 bg-surface-container-lowest/90 backdrop-blur-md border border-primary/50 text-primary">
              Alvo
            </Badge>
          )}
          {video.isShort ? (
            <Badge variant="short">Shorts</Badge>
          ) : (
            <Badge variant="long">Vídeo</Badge>
          )}
        </div>

        {/* Pílula de Duração no Canto Inferior Direito */}
        <div className="absolute bottom-2.5 right-2.5 z-10">
          <Badge variant="timestamp">{video.durationFormatted}</Badge>
        </div>
      </div>

      {/* Conteúdo do Card */}
      <div className="p-space-md flex flex-col flex-1 justify-between gap-3">
        <h3 className="font-title-sm text-title-sm font-bold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>

        <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
          <span>
            {video.publishedText || 'Recente'}
            {video.viewsText && ` • ${video.viewsText}`}
          </span>
          <span className="material-symbols-outlined text-[18px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            auto_fix_high
          </span>
        </div>
      </div>

      {/* Barra Inferior de Indicador de Seleção */}
      <div
        className={cn(
          'h-1 w-full transition-colors duration-200',
          isSelected ? 'bg-primary' : 'bg-transparent',
        )}
      />
    </div>
  );
};
