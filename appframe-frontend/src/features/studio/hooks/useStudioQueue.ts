import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { mediaService, type StudioVideoQueueItem } from '../../history';
import { removeStudioState, extractNormalizedVideoId } from '../utils';

export interface UseStudioQueueParams {
  videoUrl?: string;
  sourceUrl?: string;
  selectedVideos?: string;
  videoTitle?: string;
}

function normalizeQueueItem(item: StudioVideoQueueItem): StudioVideoQueueItem {
  const normalizedId = extractNormalizedVideoId(item);
  return {
    ...item,
    id: normalizedId || item.id,
  };
}

export const useStudioQueue = (params: UseStudioQueueParams) => {
  // Fila de vídeos selecionados na Varredura (armazenada em sessionStorage)
  const [videoQueue, setVideoQueue] = useState<StudioVideoQueueItem[]>(() => {
    try {
      const savedQueue = sessionStorage.getItem('appframe_studio_queue');
      if (savedQueue) {
        const parsed = JSON.parse(savedQueue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed
            .filter((item) => !/\/live(\/|$|\?)|\/streams(\/|$|\?)/i.test(item?.url || ''))
            .map(normalizeQueueItem);
          if (filtered.length > 0) {
            return filtered;
          }
        }
      }
    } catch {
      // Ignora erro de parse do sessionStorage
    }

    const fallbackUrl =
      params.videoUrl ||
      params.sourceUrl ||
      (params.selectedVideos
        ? params.selectedVideos.startsWith('http')
          ? params.selectedVideos
          : `https://www.youtube.com/watch?v=${params.selectedVideos}`
        : '');

    const isLiveUrl = /\/live(\/|$|\?)|\/streams(\/|$|\?)/i.test(fallbackUrl);
    const isMembersOnly = /(?:só|so|exclusivo|apenas)\s+para\s+membros|^\[membros\]|\bmembers[\s-]only\b/i.test(
      params.videoTitle || '',
    );

    if (fallbackUrl && !isLiveUrl && !isMembersOnly) {
      const normalizedId =
        extractNormalizedVideoId({ id: params.selectedVideos, url: fallbackUrl }) ||
        'selected-1';
      return [
        {
          id: normalizedId,
          url: fallbackUrl,
          title: params.videoTitle || 'Vídeo Selecionado na Varredura',
        },
      ];
    }

    return [];
  });

  const [activeQueueIndexState, setActiveQueueIndexState] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('appframe_studio_active_index');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    } catch {}
    return 0;
  });

  // Sincroniza fila e vídeo ativo caso o usuário navegue novamente com novos parâmetros de URL / sessionStorage
  useEffect(() => {
    const incomingUrl =
      params.videoUrl ||
      params.sourceUrl ||
      (params.selectedVideos
        ? params.selectedVideos.startsWith('http')
          ? params.selectedVideos
          : `https://www.youtube.com/watch?v=${params.selectedVideos}`
        : '');

    if (!incomingUrl) return;

    try {
      const savedQueueRaw = sessionStorage.getItem('appframe_studio_queue');
      if (savedQueueRaw) {
        const parsed = JSON.parse(savedQueueRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const filtered = parsed
            .filter((item) => !/\/live(\/|$|\?)|\/streams(\/|$|\?)/i.test(item?.url || ''))
            .map(normalizeQueueItem);
          if (filtered.length > 0) {
            setVideoQueue((prev) => {
              const prevKey = prev.map((v) => `${v.id}:${v.url}`).join('|');
              const nextKey = filtered.map((v) => `${v.id}:${v.url}`).join('|');
              return prevKey === nextKey ? prev : filtered;
            });

            const incomingId = extractNormalizedVideoId({
              id: params.selectedVideos,
              url: incomingUrl,
            });
            const matchIdx = filtered.findIndex(
              (item) =>
                item.url === incomingUrl || (incomingId && item.id === incomingId)
            );
            if (matchIdx !== -1) {
              const savedIdx = sessionStorage.getItem('appframe_studio_active_index');
              if (savedIdx === '0' && matchIdx === 0) {
                setActiveQueueIndexState(0);
              }
            }
            return;
          }
        }
      }
    } catch {}
  }, [params.videoUrl, params.sourceUrl, params.selectedVideos, params.videoTitle]);

  const activeQueueIndex =
    videoQueue.length > 0
      ? Math.min(Math.max(0, activeQueueIndexState), videoQueue.length - 1)
      : 0;

  const setActiveQueueIndex = useCallback((updater: number | ((prev: number) => number)) => {
    setActiveQueueIndexState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        sessionStorage.setItem('appframe_studio_active_index', String(next));
      } catch {}
      return next;
    });
  }, []);

  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([]);
  const [isDeleteStudioModalOpen, setIsDeleteStudioModalOpen] = useState<boolean>(false);
  const [isDeletingFromStudio, setIsDeletingFromStudio] = useState<boolean>(false);

  const currentVideo = videoQueue[activeQueueIndex] || null;

  const handleDeleteFromStudio = async (
    previewStreamUrl?: string | null,
    onResetStates?: () => void,
    isStudioBusy?: boolean
  ) => {
    if (isStudioBusy || !currentVideo) return;

    removeStudioState(currentVideo);

    // Se houver preview baixado, solicita exclusão do arquivo temporário no backend
    try {
      if (previewStreamUrl) {
        const previewIdMatch = previewStreamUrl.match(/preview\/([a-f0-9]{24})\/stream/);
        if (previewIdMatch && previewIdMatch[1]) {
          await mediaService.deleteStudioPreview(previewIdMatch[1]);
        }
      }
    } catch {
      // Ignora erro caso o preview já não exista mais
    }

    // Atualiza a fila de vídeos
    const newQueue = videoQueue.filter((_, idx) => idx !== activeQueueIndex);
    setVideoQueue(newQueue);
    sessionStorage.setItem('appframe_studio_queue', JSON.stringify(newQueue));

    if (newQueue.length > 0) {
      const nextIndex = Math.min(activeQueueIndex, newQueue.length - 1);
      setActiveQueueIndex(nextIndex);
      toast.success('Vídeo removido do Studio. Carregando próximo vídeo da fila...');
    } else {
      if (onResetStates) onResetStates();
      toast.success('Vídeo temporário removido do Studio.');
    }
  };

  const studioProjectTitle =
    currentVideo?.title ||
    params.videoTitle ||
    'Nenhum vídeo selecionado na Varredura';

  return {
    videoQueue,
    setVideoQueue,
    activeQueueIndex,
    setActiveQueueIndex,
    completedVideoIds,
    setCompletedVideoIds,
    currentVideo,
    isDeleteStudioModalOpen,
    setIsDeleteStudioModalOpen,
    isDeletingFromStudio,
    setIsDeletingFromStudio,
    handleDeleteFromStudio,
    studioProjectTitle,
  };
};
