import React from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import {
  ScannerHeader,
  ScannerSearchBar,
  ScannerFilterTabs,
  ScannerVideoFeed,
  ScannerBatchDock,
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
          <ScannerHeader />

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
        <ScannerVideoFeed
          isScanning={isScanning}
          hasScanned={hasScanned}
          videos={videos}
          filteredVideos={filteredVideos}
          paginatedVideos={paginatedVideos}
          channelMeta={channelMeta}
          selectedIds={selectedIds}
          safeCurrentPage={safeCurrentPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          startItemIndex={startItemIndex}
          endItemIndex={endItemIndex}
          onToggleSelect={handleToggleSelect}
          onPageChange={handlePageChange}
        />

        {/* DOCK FLUTUANTE DE LOTE (BatchDock) */}
        <ScannerBatchDock
          visible={hasScanned && selectedCount > 0 && !isScanning}
          selectedCount={selectedCount}
          totalSeconds={totalSeconds}
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
