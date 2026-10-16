import { useState } from 'react';
import { toast } from 'sonner';
import { mediaService, type StudioVideoQueueItem } from '../../history';

export interface UseStudioQueueParams {
  videoUrl?: string;
  sourceUrl?: string;
  selectedVideos?: string;
  videoTitle?: string;
}

export const useStudioQueue = (params: UseStudioQueueParams) => {
  // Fila de vídeos selecionados na Varredura (armazenada em sessionStorage)
  const [videoQueue, setVideoQueue] = useState<StudioVideoQueueItem[]>(() => {
    try {
      const savedQueue = sessionStorage.getItem('appframe_studio_queue');
      if (savedQueue) {
        const parsed = JSON.parse(savedQueue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
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

    if (fallbackUrl) {
      return [
        {
          id: params.selectedVideos || 'selected-1',
          url: fallbackUrl,
          title: params.videoTitle || 'Vídeo Selecionado na Varredura',
        },
      ];
    }

    return [];
  });

  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(0);
  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([]);
  const [isDeleteStudioModalOpen, setIsDeleteStudioModalOpen] = useState<boolean>(false);
  const [isDeletingFromStudio, setIsDeletingFromStudio] = useState<boolean>(false);

  const currentVideo = videoQueue[activeQueueIndex] || null;

  const handleDeleteFromStudio = async (
    previewStreamUrl?: string | null,
    onResetStates?: () => void
  ) => {
    if (!currentVideo) return;

    const storageKey = `appframe_studio_state_${currentVideo.id || currentVideo.url}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {}

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
