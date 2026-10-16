import React from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { VideoCard } from '../../../components/common/VideoCard';
import { ScannerChannelHeader } from './ScannerChannelHeader';
import { ScannerPagination } from './ScannerPagination';
import { ScannerVideoSkeleton } from './ScannerVideoSkeleton';
import type { ScrapedVideoCardData, ChannelMeta } from '../interfaces';

export interface ScannerVideoFeedProps {
  isScanning: boolean;
  hasScanned: boolean;
  videos: ScrapedVideoCardData[];
  filteredVideos: ScrapedVideoCardData[];
  paginatedVideos: ScrapedVideoCardData[];
  channelMeta: ChannelMeta | null;
  selectedIds: Set<string>;
  safeCurrentPage: number;
  totalPages: number;
  pageNumbers: (number | 'ellipsis-start' | 'ellipsis-end')[];
  startItemIndex: number;
  endItemIndex: number;
  onToggleSelect: (id: string) => void;
  onPageChange: (page: number) => void;
}

export const ScannerVideoFeed: React.FC<ScannerVideoFeedProps> = ({
  isScanning,
  hasScanned,
  videos,
  filteredVideos,
  paginatedVideos,
  channelMeta,
  selectedIds,
  safeCurrentPage,
  totalPages,
  pageNumbers,
  startItemIndex,
  endItemIndex,
  onToggleSelect,
  onPageChange,
}) => {
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

          {/* Paginação */}
          <ScannerPagination
            safeCurrentPage={safeCurrentPage}
            totalPages={totalPages}
            pageNumbers={pageNumbers}
            startItemIndex={startItemIndex}
            endItemIndex={endItemIndex}
            totalFilteredCount={filteredVideos.length}
            onPageChange={onPageChange}
          />
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
