import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigation } from '../contexts/NavigationContext';
import { AppShell } from '../components/layout/AppShell';
import { VideoCard, type VideoCardData } from '../components/common/VideoCard';
import { BatchDock } from '../components/layout/BatchDock';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { scraperService } from '../services/scraper.service';
import { mediaService } from '../services/media.service';

interface ScrapedVideoCardData extends VideoCardData {
  url: string;
}

const ITEMS_PER_PAGE = 20; // 5 linhas × 4 colunas

export const ScraperPage: React.FC = () => {
  const { navigate } = useNavigation();
  const [channelUrl, setChannelUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [videos, setVideos] = useState<ScrapedVideoCardData[]>([]);
  const [filter, setFilter] = useState<'all' | 'long' | 'shorts'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [channelMeta, setChannelMeta] = useState<{
    name: string;
    avatarUrl?: string;
    totalIndexed: number;
    shortsCount: number;
    longCount: number;
  } | null>(null);

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

  const handleFilterChange = (nextFilter: 'all' | 'long' | 'shorts') => {
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

  const formatDurationAccumulated = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
    }
    return `${String(mins).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

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
      <div className="flex flex-col w-full text-on-surface select-none">
        {/* ================= CONTROLES SUPERIORES & HERO ================= */}
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
          <div className="relative w-full rounded-xl bg-white dark:bg-surface-container-low p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all focus-within:shadow-[0_0_0_2px_rgba(212,163,70,0.3)] border border-neutral-200 dark:border-surface-container-high">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-3 flex-1 px-3 py-1 w-full">
                <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    smart_display
                  </span>
                </div>
                <input
                  type="text"
                  value={channelUrl}
                  disabled={isScanning}
                  onChange={(e) => setChannelUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') executeScan(channelUrl);
                  }}
                  placeholder="Cole a URL de um vídeo (ex: watch?v=...), canal ou @handle..."
                  className="w-full bg-transparent border-0 outline-none text-on-surface placeholder:text-outline font-body-md text-body-md h-10 tracking-tight disabled:opacity-50"
                />
                {channelUrl && !isScanning && (
                  <button
                    type="button"
                    onClick={() => setChannelUrl('')}
                    title="Limpar URL"
                    className="text-outline hover:text-on-surface p-1 rounded-md transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      cancel
                    </span>
                  </button>
                )}
              </div>

              <Button
                variant="primary"
                size="md"
                isLoading={isScanning}
                onClick={() => executeScan(channelUrl)}
                className="w-full sm:w-auto px-6 h-11 shrink-0"
                leftIcon={
                  <span className="material-symbols-outlined text-[20px]">
                    radar
                  </span>
                }
              >
                <span>{isScanning ? 'Varrendo canal...' : 'Varrer Canal'}</span>
              </Button>
            </div>
          </div>

          {/* Barra de Filtros e Seleção em Lote */}
          {hasScanned && videos.length > 0 && !isScanning && (
            <div className="flex flex-wrap items-center justify-between gap-space-md pt-1">
              {/* Chips de Categoria Dinâmicos */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => handleFilterChange('all')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
                    filter === 'all'
                      ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)] font-semibold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                  }`}
                >
                  <span>Todos</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-label-sm font-label-sm">
                    {videos.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFilterChange('long')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
                    filter === 'long'
                      ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)] font-semibold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                  }`}
                >
                  <span>Vídeos</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-label-sm font-label-sm">
                    {channelMeta?.longCount ?? videos.filter((v) => !v.isShort).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFilterChange('shorts')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-title-sm text-title-sm transition-all cursor-pointer ${
                    filter === 'shorts'
                      ? 'bg-primary-container/20 text-primary border border-primary/40 shadow-[0_0_10px_rgba(212,163,70,0.15)] font-semibold'
                      : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-transparent'
                  }`}
                >
                  <span>Shorts</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-container-highest text-label-sm font-label-sm">
                    {channelMeta?.shortsCount ?? videos.filter((v) => v.isShort).length}
                  </span>
                </button>
              </div>

              {/* Botão de Selecionar / Desmarcar Todos */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-title-sm text-title-sm transition-colors flex items-center gap-1 cursor-pointer border border-outline/10"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    select_all
                  </span>
                  <span>
                    {selectedIds.size === filteredVideos.length && filteredVideos.length > 0
                      ? 'Desmarcar Todos'
                      : 'Selecionar Todos'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ================= ESTADO DE CARREGAMENTO (AMBER NOIR SKELETONS) ================= */}
        {isScanning && (
          <div className="flex flex-col gap-space-lg">
            {/* Header Skeleton */}
            <div className="w-full h-24 rounded-2xl bg-surface-container-low border border-surface-container-high/60 animate-pulse p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-highest shrink-0" />
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-5 w-48 rounded bg-surface-container-highest" />
                <div className="h-3 w-72 rounded bg-surface-container-highest/60" />
              </div>
            </div>

            {/* Grid de 8 Skeletons com Shimmer Âmbar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={`skeleton-${idx}`}
                  className="group relative flex flex-col rounded-2xl bg-surface-container overflow-hidden border border-surface-container-high/60 animate-pulse shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
                >
                  {/* Thumbnail Skeleton */}
                  <div className="relative w-full aspect-video bg-surface-container-high overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent animate-pulse" />
                    {/* Badge topo direito */}
                    <div className="absolute top-3 right-3 w-14 h-5 rounded-md bg-surface-container-highest" />
                    {/* Duração canto inferior direito */}
                    <div className="absolute bottom-2.5 right-2.5 w-12 h-4 rounded bg-surface-container-highest" />
                  </div>

                  {/* Detalhes do Card */}
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

        {/* ================= ESTADO POPULADO COM DADOS REAIS ================= */}
        {!isScanning && hasScanned && videos.length > 0 && (
          <div className="flex flex-col gap-space-lg">
            {/* Card de Cabeçalho do Canal Real */}
            {channelMeta && (
              <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-surface-container-low p-space-md sm:p-space-lg shadow-[0_6px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] border border-neutral-200 dark:border-primary/20">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md relative z-10">
                  <div className="flex items-center gap-space-md">
                    {/* Avatar do Canal */}
                    <div className="relative shrink-0">
                      {channelMeta.avatarUrl ? (
                        <img
                          src={channelMeta.avatarUrl}
                          alt={channelMeta.name}
                          className="w-14 h-14 md:w-16 md:h-16 rounded-2xl object-cover shadow-[0_0_16px_rgba(212,163,70,0.25)] ring-1 ring-primary/40"
                        />
                      ) : (
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary ring-1 ring-primary/40">
                          <span className="material-symbols-outlined text-[28px]">
                            smart_display
                          </span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-neutral-950 flex items-center justify-center text-[12px] shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">
                          check
                        </span>
                      </div>
                    </div>

                    {/* Metadados do Canal */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                          {channelMeta.name}
                        </span>
                        <span
                          className="material-symbols-outlined text-primary text-[18px]"
                          title="Canal Verificado"
                        >
                          verified
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 font-body-sm text-body-sm text-on-surface-variant">
                        <span className="font-semibold text-on-surface">Canal Oficial</span>
                        <span className="text-outline">•</span>
                        <span>{channelMeta.totalIndexed} mídias extraídas</span>
                        <span className="text-outline">•</span>
                        <span className="text-primary flex items-center gap-1 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Indexação em tempo real
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contadores e Métricas */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    <div className="bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-outline/10">
                      <span className="text-label-sm font-label-sm text-outline">Total</span>
                      <span className="text-title-md font-title-md font-bold text-on-surface">
                        {videos.length}
                      </span>
                    </div>
                    <div className="bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-outline/10">
                      <span className="text-label-sm font-label-sm text-outline">Vídeos</span>
                      <span className="text-title-md font-title-md font-bold text-on-surface">
                        {channelMeta.longCount}
                      </span>
                    </div>
                    <div className="bg-surface-container px-3.5 py-2 rounded-xl flex flex-col items-center min-w-[90px] border border-outline/10">
                      <span className="text-label-sm font-label-sm text-outline">Shorts</span>
                      <span className="text-title-md font-title-md font-bold text-primary">
                        {channelMeta.shortsCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid responsivo de vídeos reais (5 linhas × 4 colunas = 20 vídeos por página) */}
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
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 pb-2 border-t border-neutral-200 dark:border-surface-container-high/60">
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Mostrando <strong className="text-on-surface">{startItemIndex}–{endItemIndex}</strong> de{' '}
                  <strong className="text-on-surface">{filteredVideos.length}</strong> mídias
                </span>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <button
                    type="button"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-title-sm font-title-sm text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer border border-outline/10"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    <span>Anterior</span>
                  </button>

                  {pageNumbers.map((pageItem) => {
                    if (pageItem === 'ellipsis-start' || pageItem === 'ellipsis-end') {
                      return (
                        <span
                          key={pageItem}
                          className="px-2 py-1 text-on-surface-variant font-mono select-none"
                        >
                          ...
                        </span>
                      );
                    }

                    const isActive = pageItem === safeCurrentPage;
                    return (
                      <button
                        key={pageItem}
                        type="button"
                        onClick={() => handlePageChange(pageItem)}
                        className={`min-w-[36px] h-9 px-2.5 rounded-lg font-title-sm text-title-sm transition-all cursor-pointer flex items-center justify-center ${
                          isActive
                            ? 'bg-primary text-neutral-950 dark:text-neutral-950 font-bold shadow-sm'
                            : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline/10'
                        }`}
                      >
                        {pageItem}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-title-sm font-title-sm text-on-surface disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer border border-outline/10"
                  >
                    <span>Próxima</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= ESTADO VAZIO INICIAL ================= */}
        {!isScanning && (!hasScanned || videos.length === 0) && (
          <EmptyState
            icon="radar"
            title="Nenhum canal consultado"
            description="Cole a URL ou @handle de um canal acima para indexar vídeos e Shorts disponíveis."
          />
        )}

        {/* ================= DOCK FLUTUANTE DE LOTE (BatchDock) ================= */}
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
