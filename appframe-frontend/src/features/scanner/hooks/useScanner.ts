import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { scraperService, mediaService } from '../services';
import { ITEMS_PER_PAGE } from '../constants';
import type {
  ScrapedVideoCardData,
  ChannelMeta,
  ScannerFilterType,
} from '../types';
import { calculatePageNumbers, mapScannedItems } from '../utils';

const VALID_SCANNER_FILTERS: Record<string, ScannerFilterType> = {
  all: 'all',
  todos: 'all',
  long: 'long',
  videos: 'long',
  longos: 'long',
  shorts: 'shorts',
  short: 'shorts',
};

function resolveScannerFilter(searchParams: URLSearchParams): ScannerFilterType {
  const raw = (
    searchParams.get('filter') ||
    searchParams.get('tab') ||
    searchParams.get('type') ||
    ''
  ).toLowerCase();
  return VALID_SCANNER_FILTERS[raw] || 'all';
}

function resolveScannerPage(searchParams: URLSearchParams): number {
  const raw = searchParams.get('page') || searchParams.get('p') || '1';
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

interface ScannerCachedData {
  channelUrl: string;
  videos: ScrapedVideoCardData[];
  channelMeta: ChannelMeta | null;
}

const getScannerCache = (): ScannerCachedData | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('appframe_scanner_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.videos) && parsed.videos.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return null;
};

export const useScanner = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cached = useMemo(() => getScannerCache(), []);
  const [channelUrl, setChannelUrl] = useState(cached?.channelUrl || '');
  const [isScanning, setIsScanning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasScanned, setHasScanned] = useState(Boolean(cached));
  const [videos, setVideos] = useState<ScrapedVideoCardData[]>(cached?.videos || []);
  const [filter, setFilter] = useState<ScannerFilterType>(() => resolveScannerFilter(searchParams));
  const [currentPage, setCurrentPage] = useState<number>(() => resolveScannerPage(searchParams));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channelMeta, setChannelMeta] = useState<ChannelMeta | null>(cached?.channelMeta || null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Sincroniza filter e page se a URL mudar (ex: botão voltar/avançar do navegador)
  useEffect(() => {
    const nextFilter = resolveScannerFilter(searchParams);
    if (nextFilter !== filter) {
      setFilter(nextFilter);
    }
    const nextPage = resolveScannerPage(searchParams);
    if (nextPage !== currentPage) {
      setCurrentPage(nextPage);
    }
  }, [searchParams]);

  // Filtragem dos cards
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (filter === 'long') return !v.isShort;
      if (filter === 'shorts') return v.isShort;
      return true;
    });
  }, [videos, filter]);

  const totalVideosAvailable =
    filter === 'all' && channelMeta?.totalChannelVideos && channelMeta.totalChannelVideos > filteredVideos.length
      ? channelMeta.totalChannelVideos
      : filteredVideos.length;

  const totalPages = Math.max(
    1,
    Math.ceil(totalVideosAvailable / ITEMS_PER_PAGE) +
      (!channelMeta?.totalChannelVideos && hasMore ? 1 : 0)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Paginação (20 vídeos por página: 5 linhas x 4 colunas)
  const paginatedVideos = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredVideos, safeCurrentPage]);

  const pageNumbers = useMemo(() => {
    return calculatePageNumbers(safeCurrentPage, totalPages);
  }, [totalPages, safeCurrentPage]);

  const fetchMoreVideos = useCallback(async () => {
    if (!channelUrl || isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    try {
      const moreItems = await scraperService.fetchMore(channelUrl, filter);
      if (moreItems && moreItems.length > 0) {
        const mapped = mapScannedItems(moreItems, channelUrl).videos;
        setVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.id));
          const fresh = mapped.filter((v) => !existingIds.has(v.id));
          if (fresh.length === 0) {
            setHasMore(false);
            return prev;
          }
          const merged = [...prev, ...fresh];
          const updatedMeta = channelMeta
            ? {
                ...channelMeta,
                totalIndexed: merged.length,
                shortsCount: merged.filter((v) => v.isShort).length,
                longCount: merged.filter((v) => !v.isShort).length,
              }
            : null;
          if (updatedMeta) {
            setChannelMeta(updatedMeta);
          }
          try {
            sessionStorage.setItem(
              'appframe_scanner_cache',
              JSON.stringify({
                channelUrl,
                videos: merged,
                channelMeta: updatedMeta || channelMeta,
              })
            );
          } catch {}
          return merged;
        });

        const moreAvailable = Boolean(moreItems[0]?.hasMore);
        setHasMore(moreAvailable);
      } else {
        setHasMore(false);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar mais mídias do canal:', err?.message || err);
    } finally {
      setIsFetchingMore(false);
    }
  }, [channelUrl, isFetchingMore, hasMore, filter, channelMeta]);

  // Se a página atual exigir mais mídias do que já carregamos, busca automaticamente
  useEffect(() => {
    if (hasScanned && hasMore && !isFetchingMore && channelUrl) {
      const neededItems = safeCurrentPage * ITEMS_PER_PAGE;
      if (filteredVideos.length < neededItems) {
        fetchMoreVideos();
      }
    }
  }, [filter, safeCurrentPage, filteredVideos.length, hasScanned, hasMore, isFetchingMore, channelUrl, fetchMoreVideos]);

  const handleFilterChange = useCallback((nextFilter: ScannerFilterType) => {
    setFilter(nextFilter);
    setCurrentPage(1);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextFilter === 'all') {
          next.delete('filter');
          next.delete('tab');
          next.delete('type');
        } else {
          next.set('filter', nextFilter);
          next.delete('tab');
          next.delete('type');
        }
        next.delete('page');
        next.delete('p');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const handlePageChange = useCallback(
    async (page: number) => {
      const clamped = Math.max(1, page);
      setCurrentPage(clamped);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (clamped <= 1) {
            next.delete('page');
            next.delete('p');
          } else {
            next.set('page', String(clamped));
            next.delete('p');
          }
          return next;
        },
        { replace: true }
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Se a página selecionada necessitar de mais vídeos para renderizar
      const neededItems = clamped * ITEMS_PER_PAGE;
      if (filteredVideos.length < neededItems && hasMore && !isFetchingMore) {
        await fetchMoreVideos();
      }
    },
    [filteredVideos.length, hasMore, isFetchingMore, fetchMoreVideos, setSearchParams]
  );

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
        const result = mapScannedItems(items, cleanUrl);

        setVideos(result.videos);
        setChannelMeta(result.channelMeta);
        setFilter('all');
        setCurrentPage(1);
        setHasScanned(true);
        const moreAvailable = Boolean((items[0] as any)?.hasMore ?? true);
        setHasMore(moreAvailable);

        try {
          sessionStorage.setItem(
            'appframe_scanner_cache',
            JSON.stringify({
              channelUrl: cleanUrl,
              videos: result.videos,
              channelMeta: result.channelMeta,
            })
          );
        } catch {}

        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.delete('filter');
            next.delete('tab');
            next.delete('type');
            next.delete('page');
            next.delete('p');
            return next;
          },
          { replace: true }
        );

        if (result.targetVideo) {
          setSelectedIds(new Set([result.targetVideo.id]));
          toast.success(
            `${result.videos.length} mídias encontradas! Vídeo "${result.targetVideo.title.slice(0, 32)}..." pré-selecionado.`
          );
        } else {
          setSelectedIds(new Set());
          toast.success(
            `${result.videos.length} mídias encontradas (${result.shortsCount} Shorts, ${result.longCount} vídeos)!`
          );
        }
      } else {
        setVideos([]);
        setHasScanned(false);
        setHasMore(false);
        try {
          sessionStorage.removeItem('appframe_scanner_cache');
        } catch {}
        toast.error('Nenhum vídeo público encontrado para este canal.');
      }
    } catch (err: any) {
      setVideos([]);
      setHasScanned(false);
      setHasMore(false);
      try {
        sessionStorage.removeItem('appframe_scanner_cache');
      } catch {}
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Não foi possível extrair mídias do canal informado. Verifique o link e tente novamente.';
      toast.error(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownloadSelected = async (onSuccess?: () => void) => {
    const selectedVideos = videos.filter((v) => selectedIds.has(v.id));
    if (selectedVideos.length === 0) return;

    setIsDownloading(true);
    try {
      await mediaService.downloadBatch(
        selectedVideos.map((v) => ({
          url: v.url,
          title: v.title,
        }))
      );

      toast.success(
        `${selectedVideos.length} ${
          selectedVideos.length === 1 ? 'vídeo adicionado' : 'vídeos adicionados'
        } à fila de download!`
      );
      if (onSuccess) {
        onSuccess();
      }
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

  const handleOpenStudio = (
    onNavigateStudio: (params: { sourceUrl: string; videoTitle: string }) => void
  ) => {
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
          }))
        )
      );
    } catch {}

    const first = selectedList[0];
    onNavigateStudio({
      sourceUrl: first.url,
      videoTitle: first.title,
    });
  };

  const startItemIndex =
    filteredVideos.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItemIndex = Math.min(
    safeCurrentPage * ITEMS_PER_PAGE,
    filteredVideos.length
  );

  return {
    channelUrl,
    setChannelUrl,
    isScanning,
    isDownloading,
    hasScanned,
    videos,
    filter,
    currentPage,
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
    hasMore,
    isFetchingMore,
    fetchMoreVideos,
    executeScan,
    handleFilterChange,
    handlePageChange,
    handleToggleSelect,
    handleSelectAll,
    handleClearSelection,
    handleDownloadSelected,
    handleOpenStudio,
  };
};
