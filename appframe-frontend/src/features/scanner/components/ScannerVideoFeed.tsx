import React from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { VideoCard } from '../../../components/common/VideoCard';
import { ScannerChannelHeader } from './ScannerChannelHeader';
import { ScannerPagination } from './ScannerPagination';
import { ScannerVideoSkeleton } from './ScannerVideoSkeleton';
import type { ScrapedVideoCardData, ChannelMeta } from '../types';

import { useScannerContext } from '../context';

export interface ScannerVideoFeedProps {
  isScanning?: boolean;
  hasScanned?: boolean;
  videos?: ScrapedVideoCardData[];
  filteredVideos?: ScrapedVideoCardData[];
  paginatedVideos?: ScrapedVideoCardData[];
  channelMeta?: ChannelMeta | null;
  selectedIds?: Set<string>;
  safeCurrentPage?: number;
  totalPages?: number;
  pageNumbers?: (number | 'ellipsis-start' | 'ellipsis-end')[];
  startItemIndex?: number;
  endItemIndex?: number;
  onToggleSelect?: (id: string) => void;
  onPageChange?: (page: number) => void;
}

export const ScannerVideoFeed: React.FC<ScannerVideoFeedProps> = (props) => {
  const scanner = useScannerContext();

  const isScanning = props.isScanning ?? scanner.isScanning;
  const hasScanned = props.hasScanned ?? scanner.hasScanned;
  const videos = props.videos ?? scanner.videos;
  const paginatedVideos = props.paginatedVideos ?? scanner.paginatedVideos;
  const channelMeta = props.channelMeta !== undefined ? props.channelMeta : scanner.channelMeta;
  const selectedIds = props.selectedIds ?? scanner.selectedIds;
  const onToggleSelect = props.onToggleSelect ?? scanner.handleToggleSelect;

  return (
    <section className="relative min-h-[400px]">
      {/* Skeleton de Carregamento */}
      {isScanning && <ScannerVideoSkeleton />}

      {/* Estado Populado com Dados Reais */}
      {!isScanning && hasScanned && videos.length > 0 && (
        <div className="flex flex-col gap-space-lg">
          {/* Card de Cabeçalho do Canal Real */}
          {channelMeta && (
            <ScannerChannelHeader
              channelMeta={channelMeta}
              totalVideos={videos.length}
            />
          )}

          {/* Grid responsivo de vídeos reais */}
          {paginatedVideos.length === 0 && (scanner.isFetchingMore || scanner.hasMore) ? (
            <ScannerVideoSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {paginatedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  isSelected={selectedIds.has(video.id)}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </div>
          )}

          {/* Paginação */}
          <ScannerPagination />
        </div>
      )}

      {/* Estado Vazio Inicial */}
      {!isScanning && (!hasScanned || videos.length === 0) && (
        <EmptyState
          icon="radar"
          title="Nenhum canal consultado"
          description="Cole a URL ou @handle de um canal acima para indexar vídeos e Shorts disponíveis."
        />
      )}
    </section>
  );
};
