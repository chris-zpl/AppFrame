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

export const useScanner = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [channelUrl, setChannelUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [videos, setVideos] = useState<ScrapedVideoCardData[]>([]);
  const [filter, setFilter] = useState<ScannerFilterType>(() => resolveScannerFilter(searchParams));
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channelMeta, setChannelMeta] = useState<ChannelMeta | null>(null);

  // Sincroniza filter se a URL mudar (ex: botão voltar/avançar do navegador)
  useEffect(() => {
    const nextFilter = resolveScannerFilter(searchParams);
    if (nextFilter !== filter) {
      setFilter(nextFilter);
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

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Paginação (20 vídeos por página: 5 linhas x 4 colunas)
  const paginatedVideos = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredVideos.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredVideos, safeCurrentPage]);

  const pageNumbers = useMemo(() => {
    return calculatePageNumbers(safeCurrentPage, totalPages);
  }, [totalPages, safeCurrentPage]);

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
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

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
        const result = mapScannedItems(items, cleanUrl);

        setVideos(result.videos);
        setChannelMeta(result.channelMeta);
        setFilter('all');
        setCurrentPage(1);
        setHasScanned(true);

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
