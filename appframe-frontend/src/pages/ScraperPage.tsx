import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { VideoCard } from '../components/common/VideoCard';
import { BatchDock } from '../components/layout/BatchDock';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import {
  scraperService,
  mediaService,
  ITEMS_PER_PAGE,
  formatDurationAccumulated,
  type ScrapedVideoCardData,
  type ChannelMeta,
  type ScannerFilterType,
  ScannerSearchBar,
  ScannerFilterTabs,
  ScannerChannelHeader,
  ScannerPagination,
} from '../features/scanner';

export const ScraperPage: React.FC = () => {
  const { navigate } = useNavigation();
  const [channelUrl, setChannelUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [videos, setVideos] = useState<ScrapedVideoCardData[]>([]);
  const [filter, setFilter] = useState<ScannerFilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channelMeta, setChannelMeta] = useState<ChannelMeta | null>(null);

  // Filtragem dos cards
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (filter === 'long') return !v.isShort;
      if (filter === 'shorts') return v.isShort;
      return true;
    });
  }, [videos, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Paginação (20 vídeos por página: 5 linhas x 4 colunas)
  const paginatedVideos = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredVideos, safeCurrentPage]);

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);

    if (start > 2) pages.push('ellipsis-start');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis-end');

    pages.push(totalPages);
    return pages;
  }, [totalPages, safeCurrentPage]);

  const handleFilterChange = (nextFilter: ScannerFilterType) => {
    setFilter(nextFilter);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    const clamped = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Contagem de vídeos selecionados e duração acumulada
  const { selectedCount, totalSeconds } = useMemo(() => {
    let secs = 0;
    videos.forEach((v) => {
      if (selectedIds.has(v.id)) {
        secs += v.durationSeconds || 0;
      }
    });
    return {
      selectedCount: selectedIds.size,
      totalSeconds: secs,
    };
  }, [videos, selectedIds]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredVideos.length && filteredVideos.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const executeScan = async (targetUrl: string) => {
    const cleanUrl = targetUrl.trim();
    if (!cleanUrl) {
      toast.error('Informe a URL ou @handle do canal para escanear.');
      return;
    }

    setIsScanning(true);
    setChannelUrl(cleanUrl);

    try {
      const items = await scraperService.scanChannel(cleanUrl);

      if (items && items.length > 0) {
        const mappedVideos: ScrapedVideoCardData[] = items.map((it) => {
          const isShort = Boolean(it.isShort ?? it.is_short);
          const durationSeconds = it.durationSeconds ?? it.duration_seconds ?? it.duration ?? 0;
          let durationFormatted =
            it.durationFormatted || it.timestamp_formatted || '00:00';
          if (durationSeconds > 0 && (!durationFormatted || durationFormatted === '00:00' || (durationFormatted === '01:00' && durationSeconds !== 60))) {
            const mins = Math.floor(durationSeconds / 60);
            const secs = durationSeconds % 60;
            durationFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          }
          const thumbnailUrl =
            it.thumbnailUrl || it.thumbnail_url || `https://i.ytimg.com/vi/${it.id}/hqdefault.jpg`;
          const url =
            it.url ||
            (isShort
              ? `https://www.youtube.com/shorts/${it.id}`
              : `https://www.youtube.com/watch?v=${it.id}`);

          return {
            id: it.id,
            url,
            title: it.title || 'Sem título',
            thumbnailUrl,
            durationFormatted,
            durationSeconds,
            isShort,
            publishedText: it.publishedAt || 'Recente',
            viewsText: it.viewCount,
            isTargetVideo: Boolean(it.isTargetVideo || it.selected),
          };
        });

        const shortsCount = mappedVideos.filter((v) => v.isShort).length;
        const longCount = mappedVideos.filter((v) => !v.isShort).length;

        // Extrai o nome do canal a partir dos metadados ou do handle/URL
        let channelName = items[0]?.channelTitle;
        if (!channelName) {
          channelName = cleanUrl
            .replace(/https?:\/\/(www\.)?youtube\.com\//, '')
            .replace(/\/$/, '')
            .replace(/\/(videos|shorts)$/, '');
          if (!channelName.startsWith('@') && !channelName.startsWith('channel/')) {
            channelName = `@${channelName}`;
          }
        }

        const avatarUrl = items[0]?.channelAvatarUrl || mappedVideos[0]?.thumbnailUrl;

        // Detecta se a URL inserida é de um vídeo específico
        const videoMatch = cleanUrl.match(
          /(?:(?:v|vi)=|\/(?:v|vi|shorts|embed)\/|youtu\.be\/|\/watch\?v=)([\w-]{11})/i,
        );
        const targetVideoId = videoMatch ? videoMatch[1] : null;

        const targetVideo = mappedVideos.find(
          (v) => v.isTargetVideo || (targetVideoId && v.id === targetVideoId),
        );

        setVideos(mappedVideos);
        setChannelMeta({
          name: channelName,
          avatarUrl,
          totalIndexed: mappedVideos.length,
          shortsCount,
          longCount,
        });
        setFilter('all');
        setCurrentPage(1);
        setHasScanned(true);

        if (targetVideo) {
          setSelectedIds(new Set([targetVideo.id]));
          toast.success(
            `${mappedVideos.length} mídias encontradas! Vídeo "${targetVideo.title.slice(0, 32)}..." pré-selecionado.`,
          );
        } else {
          setSelectedIds(new Set());
          toast.success(
            `${mappedVideos.length} mídias encontradas (${shortsCount} Shorts, ${longCount} vídeos)!`,
          );
        }
      } else {
        setVideos([]);
        setHasScanned(false);
        toast.error('Nenhum vídeo público encontrado para este canal.');
      }
    } catch (err: any) {
      setVideos([]);
      setHasScanned(false);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível extrair mídias do canal informado. Verifique o link e tente novamente.';
      toast.error(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownloadSelected = async () => {
    const selectedVideos = videos.filter((v) => selectedIds.has(v.id));
    if (selectedVideos.length === 0) return;

    setIsDownloading(true);
    try {
      await mediaService.downloadBatch(
        selectedVideos.map((v) => ({
          url: v.url,
          title: v.title,
        })),
      );

      toast.success(
        `${selectedVideos.length} ${
          selectedVideos.length === 1 ? 'vídeo adicionado' : 'vídeos adicionados'
        } à fila de download!`,
      );
      navigate('historico');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Falha ao enfileirar vídeos para download.';
      toast.error(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenStudio = () => {
    const selectedList = videos.filter((v) => selectedIds.has(v.id));
    if (selectedList.length === 0) {
      toast.error('Selecione pelo menos um vídeo na varredura para abrir no Studio.');
      return;
    }

    try {
      sessionStorage.setItem(
        'appframe_studio_queue',
        JSON.stringify(
          selectedList.map((v) => ({
            id: v.id,
            url: v.url,
            title: v.title,
            thumbnailUrl: v.thumbnailUrl,
            durationSeconds: v.durationSeconds,
            durationFormatted: v.durationFormatted,
            isShort: v.isShort,
          })),
        ),
      );
    } catch {}

    const first = selectedList[0];
    navigate('studio', {
      sourceUrl: first.url,
      videoTitle: first.title,
    });
  };

  const startItemIndex = filteredVideos.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItemIndex = Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredVideos.length);

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
          onDownloadSelected={handleDownloadSelected}
          onOpenStudio={handleOpenStudio}
          isDownloading={isDownloading}
        />
      </div>
    </AppShell>
  );
};
