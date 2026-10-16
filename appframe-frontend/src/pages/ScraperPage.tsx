import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { VideoCard } from '../components/common/VideoCard';
import { BatchDock } from '../components/layout/BatchDock';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import {
  formatDurationAccumulated,
  ScannerSearchBar,
  ScannerFilterTabs,
  ScannerChannelHeader,
  ScannerPagination,
  useScanner,
} from '../features/scanner';

export const ScraperPage: React.FC = () => {
  const { navigate } = useNavigation();

  const {
    channelUrl,
    setChannelUrl,
    isScanning,
    isDownloading,
    hasScanned,
    videos,
    filter,
    safeCurrentPage,
    totalPages,
    pageNumbers,
    startItemIndex,
    endItemIndex,
    filteredVideos,
    paginatedVideos,
    channelMeta,
    selectedIds,
    selectedCount,
    totalSeconds,
    executeScan,
    handleFilterChange,
    handlePageChange,
    handleToggleSelect,
    handleSelectAll,
    handleClearSelection,
    handleDownloadSelected,
    handleOpenStudio,
  } = useScanner();

  return (
    <AppShell
      currentPath="varredura"
      onNavigate={(path) => navigate(path)}
    >
      <div className="flex flex-col w-full text-on-surface">
        {/* CONTROLES SUPERIORES & HERO */}
        <section className="flex flex-col gap-space-md mb-space-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
            <div className="flex flex-col">
              <div className="flex items-center gap-space-sm mb-1 flex-wrap">
                <h1 className="font-headline-md md:font-headline-lg text-headline-md md:text-headline-lg tracking-tight font-bold text-on-surface">
                  Varredura de Canais
                </h1>
                <Badge variant="status-live">
                  YouTube InnerTube Conectado
                </Badge>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
                Insira a URL de um vídeo, canal ou @handle para indexar vídeos reais, filtrar Shorts e enviar diretamente para corte dinâmico no Studio ou download em lote.
              </p>
            </div>
          </div>

          {/* Barra de Pesquisa de URL */}
          <ScannerSearchBar
            channelUrl={channelUrl}
            setChannelUrl={setChannelUrl}
            isScanning={isScanning}
            onScan={executeScan}
          />

          {/* Barra de Filtros e Seleção em Lote */}
          {hasScanned && videos.length > 0 && !isScanning && (
            <ScannerFilterTabs
              filter={filter}
              onFilterChange={handleFilterChange}
              videos={videos}
              channelMeta={channelMeta}
              selectedCount={selectedIds.size}
              filteredCount={filteredVideos.length}
              onSelectAll={handleSelectAll}
            />
          )}
        </section>

        {/* FEED DE VÍDEOS */}
        <section className="relative min-h-[400px]">
          {/* Skeleton de Carregamento */}
          {isScanning && (
            <div className="flex flex-col gap-space-md animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col rounded-2xl bg-surface-container border border-surface-container-high overflow-hidden shadow-sm h-72"
                  >
                    <div className="w-full aspect-video bg-surface-container-high relative" />
                    <div className="p-space-md flex flex-col flex-1 justify-between gap-3">
                      <div className="flex flex-col gap-2">
                        <div className="h-4 bg-surface-container-highest rounded w-5/6" />
                        <div className="h-4 bg-surface-container-highest rounded w-3/5" />
                      </div>
                      <div className="h-3 bg-surface-container-highest/60 rounded w-1/3 mt-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    onToggleSelect={handleToggleSelect}
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
                onPageChange={handlePageChange}
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

        {/* DOCK FLUTUANTE DE LOTE (BatchDock) */}
        <BatchDock
          visible={hasScanned && selectedCount > 0 && !isScanning}
          selectedCount={selectedCount}
          totalDurationFormatted={formatDurationAccumulated(totalSeconds)}
          onClearSelection={handleClearSelection}
          onDownloadSelected={() => handleDownloadSelected(() => navigate('historico'))}
          onOpenStudio={() =>
            handleOpenStudio((params) => navigate('studio', params))
          }
          isDownloading={isDownloading}
        />
      </div>
    </AppShell>
  );
};
