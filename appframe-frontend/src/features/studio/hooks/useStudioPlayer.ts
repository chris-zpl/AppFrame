import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../lib/api';
import { mediaService, type StudioVideoQueueItem } from '../../history';
import type { AspectRatio } from '../types';

export interface UseStudioPlayerProps {
  currentVideo: StudioVideoQueueItem | null;
  onRestoreSavedState?: (saved: any, videoItem: StudioVideoQueueItem) => void;
}

export const useStudioPlayer = ({
  currentVideo,
  onRestoreSavedState,
}: UseStudioPlayerProps) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const [totalDuration, setTotalDuration] = useState<number>(0.0);

  // Timeline & Cortes de Precisão (In, Out e Onda Sonora Real do Vídeo)
  const [trimIn, setTrimIn] = useState<number>(0.0);
  const [trimOut, setTrimOut] = useState<number>(0.0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

  // Estados do download e stream real do vídeo no Studio
  const [isPreparingPreview, setIsPreparingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewStreamUrl, setPreviewStreamUrl] = useState<string | null>(null);
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null);

  // Referências
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const draggingHandleRef = useRef<'in' | 'out' | 'playhead' | null>(null);

  // Referências para estabilização de callbacks e prevenção estrita de requisições infinitas
  const onRestoreSavedStateRef = useRef(onRestoreSavedState);
  useEffect(() => {
    onRestoreSavedStateRef.current = onRestoreSavedState;
  }, [onRestoreSavedState]);

  const loadedVideoUrlRef = useRef<string | null>(null);
  const inFlightVideoUrlRef = useRef<string | null>(null);

  // Identifica se o erro é decorrente de restrição de idade ou cookies do YouTube
  const isAuthError = Boolean(
    previewError &&
      (previewError.toLowerCase().includes('sign in') ||
        previewError.toLowerCase().includes('confirm your age') ||
        previewError.toLowerCase().includes('cookies') ||
        previewError.toLowerCase().includes('not a bot') ||
        previewError.toLowerCase().includes('restrição de idade') ||
        previewError.toLowerCase().includes('conta global') ||
        previewError.toLowerCase().includes('authentication') ||
        previewError.toLowerCase().includes('login'))
  );

  // Sincroniza seek de tempo no estado e no elemento <video> real
  const seekVideoTo = useCallback(
    (targetTime: number) => {
      const maxDuration =
        totalDuration > 0 ? totalDuration : videoRef.current?.duration || 0;
      const clamped =
        maxDuration > 0
          ? Math.max(0, Math.min(maxDuration, targetTime))
          : Math.max(0, targetTime);
      setCurrentTime(clamped);
      if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
        try {
          videoRef.current.currentTime = clamped;
        } catch {
          // Ignora caso o metadata ainda não esteja pronto
        }
      }
    },
    [totalDuration]
  );

  // Controle síncrono e direto de Play / Pause a partir do clique do usuário
  const handleTogglePlay = useCallback(async () => {
    const videoEl = videoRef.current;
    if (!videoEl || !previewStreamUrl) return;

    if (videoEl.paused) {
      // Se estiver no fim do corte ou fora dos limites, reposiciona no início
      if (
        trimOut > trimIn &&
        (videoEl.currentTime < trimIn || videoEl.currentTime >= trimOut - 0.15)
      ) {
        videoEl.currentTime = trimIn;
        setCurrentTime(trimIn);
      }
      try {
        await videoEl.play();
        setIsPlaying(true);
      } catch (err: any) {
        console.warn('Falha na reprodução com áudio ativo. Tentando com mudo...', err);
        try {
          videoEl.muted = true;
          setIsMuted(true);
          await videoEl.play();
          setIsPlaying(true);
        } catch (muteErr) {
          console.error('Falha ao reproduzir elemento de vídeo:', muteErr);
          setIsPlaying(false);
          toast.error('O navegador bloqueou a reprodução automática. Clique novamente para iniciar.');
        }
      }
    } else {
      videoEl.pause();
      setIsPlaying(false);
    }
  }, [previewStreamUrl, trimIn, trimOut]);

  // Atalho de teclado: Barra de espaço para Play / Pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTogglePlay]);

  // Interatividade de arraste da timeline
  const handleTimelineMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    handle: 'in' | 'out' | 'playhead'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    draggingHandleRef.current = handle;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!timelineRef.current || !draggingHandleRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      const percentage = relativeX / rect.width;
      const newTime = percentage * totalDuration;

      if (draggingHandleRef.current === 'in') {
        const nextIn = Math.min(newTime, trimOut - 0.5);
        setTrimIn(nextIn);
        if (currentTime < nextIn) {
          seekVideoTo(nextIn);
        }
      } else if (draggingHandleRef.current === 'out') {
        const nextOut = Math.max(newTime, trimIn + 0.5);
        setTrimOut(nextOut);
        if (currentTime > nextOut) {
          seekVideoTo(nextOut);
        }
      } else if (draggingHandleRef.current === 'playhead') {
        seekVideoTo(newTime);
      }
    };

    const onMouseUp = () => {
      draggingHandleRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || draggingHandleRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    const newTime = percentage * totalDuration;
    seekVideoTo(newTime);
  };

  // Carrega vídeo para preview no Studio com proteção anti-loop
  const loadVideoPreview = useCallback(
    async (videoItem: StudioVideoQueueItem, force: boolean = false) => {
      const videoUrl = videoItem?.url;
      if (!videoUrl) return;

      // Evita disparos duplicados ou simultâneos se já estiver carregando ou já estiver carregado
      if (!force) {
        if (inFlightVideoUrlRef.current === videoUrl) {
          return;
        }
        if (loadedVideoUrlRef.current === videoUrl && previewStreamUrl && !previewError) {
          return;
        }
      }

      inFlightVideoUrlRef.current = videoUrl;
      setIsPlaying(false);
      setIsPreparingPreview(true);
      setPreviewError(null);
      setWaveformPeaks([]);
      setTotalDuration(0.0);
      setTrimIn(0.0);
      setTrimOut(0.0);
      setCurrentTime(0.0);

      const storageKey = `appframe_studio_state_${videoItem.id || videoItem.url}`;
      let saved: any = null;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) saved = JSON.parse(raw);
      } catch {}

      if (onRestoreSavedStateRef.current) {
        onRestoreSavedStateRef.current(saved, videoItem);
      }

      try {
        const preview = await mediaService.prepareStudioPreview(videoItem.url);
        const streamUrl = preview.streamUrl
          ? (preview.streamUrl.startsWith('http')
              ? preview.streamUrl
              : `${API_BASE_URL.replace(/\/api\/v1$/, '')}${preview.streamUrl.startsWith('/') ? '' : '/'}${preview.streamUrl}`)
          : `${API_BASE_URL}/media/preview/${preview.previewId}/stream`;
        const realDuration =
          preview.durationSeconds && preview.durationSeconds > 0
            ? Number(preview.durationSeconds.toFixed(2))
            : 0.0;

        const restoredTrimIn = typeof saved?.trimIn === 'number' ? saved.trimIn : 0.0;
        const restoredTrimOut =
          typeof saved?.trimOut === 'number' && saved.trimOut > 0
            ? Math.min(saved.trimOut, realDuration > 0 ? realDuration : saved.trimOut)
            : realDuration;

        setPreviewStreamUrl(streamUrl);
        setCurrentPreviewId(preview.previewId);
        setTotalDuration(realDuration);
        setTrimIn(restoredTrimIn);
        setTrimOut(restoredTrimOut);
        setCurrentTime(restoredTrimIn);
        setWaveformPeaks(
          Array.isArray(preview.waveformPeaks) && preview.waveformPeaks.length > 0
            ? preview.waveformPeaks
            : []
        );

        if (saved?.aspectRatio) {
          setAspectRatio(saved.aspectRatio);
        } else if (
          videoItem.isShort ||
          (preview.height && preview.width && preview.height > preview.width)
        ) {
          setAspectRatio('9:16');
        } else if (preview.width && preview.height && preview.width >= preview.height) {
          setAspectRatio('16:9');
        }

        loadedVideoUrlRef.current = videoUrl;
      } catch (err: any) {
        console.error('Erro ao baixar vídeo para preview no Studio:', err);
        const rawMsg =
          err?.response?.data?.message ||
          'Não foi possível baixar o vídeo selecionado para visualização em tempo real.';
        const msgStr = Array.isArray(rawMsg) ? rawMsg[0] : String(rawMsg);
        const isRestricted =
          msgStr.toLowerCase().includes('sign in') ||
          msgStr.toLowerCase().includes('confirm your age') ||
          msgStr.toLowerCase().includes('cookies') ||
          msgStr.toLowerCase().includes('not a bot') ||
          msgStr.toLowerCase().includes('restrição de idade') ||
          msgStr.toLowerCase().includes('conta global') ||
          msgStr.toLowerCase().includes('authentication') ||
          msgStr.toLowerCase().includes('login');

        const friendlyMsg = isRestricted
          ? 'Este vídeo possui restrição de idade (+18) do YouTube. O download requer autorização da conta global configurada no servidor (storage/cookies.txt).'
          : msgStr;

        setPreviewError(friendlyMsg);
        toast.error(friendlyMsg);
      } finally {
        inFlightVideoUrlRef.current = null;
        setIsPreparingPreview(false);
      }
    },
    [previewStreamUrl, previewError]
  );

  // Carrega vídeo atual estritamente quando a URL mudar
  useEffect(() => {
    const videoUrl = currentVideo?.url;
    if (
      videoUrl &&
      videoUrl !== loadedVideoUrlRef.current &&
      videoUrl !== inFlightVideoUrlRef.current
    ) {
      loadVideoPreview(currentVideo);
    } else if (!videoUrl) {
      loadedVideoUrlRef.current = null;
      inFlightVideoUrlRef.current = null;
      setPreviewStreamUrl(null);
      setCurrentPreviewId(null);
      setPreviewError(null);
    }
  }, [currentVideo?.url, loadVideoPreview]);

  return {
    aspectRatio,
    setAspectRatio,
    isPlaying,
    setIsPlaying,
    isMuted,
    setIsMuted,
    currentTime,
    setCurrentTime,
    totalDuration,
    setTotalDuration,
    trimIn,
    setTrimIn,
    trimOut,
    setTrimOut,
    waveformPeaks,
    setWaveformPeaks,
    isPreparingPreview,
    previewError,
    setPreviewError,
    previewStreamUrl,
    setPreviewStreamUrl,
    currentPreviewId,
    setCurrentPreviewId,
    isAuthError,
    videoRef,
    timelineRef,
    seekVideoTo,
    handleTogglePlay,
    handleTimelineMouseDown,
    handleTimelineClick,
    loadVideoPreview,
  };
};
