import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../lib/api';
import { mediaService, type StudioVideoQueueItem } from '../../history';
import type { AspectRatio } from '../types';
import { getSavedStudioState } from '../utils';

export interface UseStudioPlayerProps {
  currentVideo: StudioVideoQueueItem | null;
  onRestoreSavedState?: (saved: any, videoItem: StudioVideoQueueItem) => void;
}

export const useStudioPlayer = ({
  currentVideo,
  onRestoreSavedState,
}: UseStudioPlayerProps) => {
  const initialSaved = getSavedStudioState(currentVideo);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(() => {
    if (initialSaved?.aspectRatio === '9:16' || initialSaved?.aspectRatio === '16:9') {
      return initialSaved.aspectRatio;
    }
    return currentVideo?.isShort ? '9:16' : '16:9';
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(() => {
    return typeof initialSaved?.currentTime === 'number' && initialSaved.currentTime >= 0
      ? initialSaved.currentTime
      : (typeof initialSaved?.trimIn === 'number' ? initialSaved.trimIn : 0.0);
  });
  const [totalDuration, setTotalDuration] = useState<number>(0.0);

  // Timeline & Cortes de Precisão (In, Out e Onda Sonora Real do Vídeo)
  const [trimIn, setTrimIn] = useState<number>(() => {
    return typeof initialSaved?.trimIn === 'number' ? initialSaved.trimIn : 0.0;
  });
  const [trimOut, setTrimOut] = useState<number>(() => {
    return typeof initialSaved?.trimOut === 'number' && initialSaved.trimOut > 0
      ? initialSaved.trimOut
      : 0.0;
  });
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
  const lastTimeRef = useRef<number>(currentTime);
  const initialSeekTimeRef = useRef<number | null>(
    typeof initialSaved?.currentTime === 'number' && initialSaved.currentTime > 0
      ? initialSaved.currentTime
      : null
  );

  // Referências para estabilização de callbacks e prevenção estrita de requisições infinitas
  const onRestoreSavedStateRef = useRef(onRestoreSavedState);
  useEffect(() => {
    onRestoreSavedStateRef.current = onRestoreSavedState;
  }, [onRestoreSavedState]);

  const lastAttemptedUrlRef = useRef<string | null>(null);
  const inFlightVideoUrlRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cancela qualquer requisição pendente ao desmontar o hook
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

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
      lastTimeRef.current = clamped;
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
      // Se estiver fora da área amarela selecionada (antes de trimIn ou no fim/após trimOut), reposiciona no início do corte (trimIn)
      const isOutsideCut =
        videoEl.currentTime < trimIn ||
        (trimOut > trimIn && videoEl.currentTime >= trimOut - 0.2) ||
        (totalDuration > 0 && videoEl.currentTime >= totalDuration - 0.15);

      if (isOutsideCut) {
        videoEl.currentTime = trimIn;
        lastTimeRef.current = trimIn;
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
  }, [previewStreamUrl, trimIn, trimOut, totalDuration]);

  // Pausa o vídeo de forma síncrona e garante que o elemento de vídeo seja interrompido
  const pauseVideo = useCallback(() => {
    const videoEl = videoRef.current;
    if (videoEl && !videoEl.paused) {
      videoEl.pause();
    }
    setIsPlaying(false);
  }, []);

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

  // Carrega vídeo para preview no Studio com proteção anti-loop estrita
  const loadVideoPreview = useCallback(
    async (videoItem: StudioVideoQueueItem, force: boolean = false) => {
      const videoUrl = videoItem?.url;
      if (!videoUrl) return;

      // Evita disparos duplicados ou simultâneos se já estiver carregando ou já tentado
      if (!force) {
        if (inFlightVideoUrlRef.current === videoUrl) {
          return;
        }
        if (lastAttemptedUrlRef.current === videoUrl) {
          return;
        }
      }

      // Aborta requisição em voo anterior se o usuário mudou de vídeo
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      lastAttemptedUrlRef.current = videoUrl;
      inFlightVideoUrlRef.current = videoUrl;
      setIsPlaying(false);
      setIsPreparingPreview(true);
      setPreviewError(null);
      setWaveformPeaks([]);
      setTotalDuration(0.0);
      setTrimIn(0.0);
      setTrimOut(0.0);
      setCurrentTime(0.0);

      const saved = getSavedStudioState(videoItem);

      if (onRestoreSavedStateRef.current) {
        onRestoreSavedStateRef.current(saved, videoItem);
      }

      try {
        const preview = await mediaService.prepareStudioPreview(
          videoItem.url,
          abortController.signal
        );

        if (abortController.signal.aborted) {
          return;
        }

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

        const restoredCurrentTime =
          typeof saved?.currentTime === 'number' &&
          saved.currentTime >= restoredTrimIn &&
          (restoredTrimOut <= 0 || saved.currentTime <= restoredTrimOut)
            ? saved.currentTime
            : restoredTrimIn;

        setPreviewStreamUrl(streamUrl);
        setCurrentPreviewId(preview.previewId);
        setTotalDuration(realDuration);
        setTrimIn(restoredTrimIn);
        setTrimOut(restoredTrimOut);
        setCurrentTime(restoredCurrentTime);
        initialSeekTimeRef.current = restoredCurrentTime;
        lastTimeRef.current = restoredCurrentTime;
        setWaveformPeaks(
          Array.isArray(preview.waveformPeaks) && preview.waveformPeaks.length > 0
            ? preview.waveformPeaks
            : []
        );

        if (saved?.aspectRatio === '9:16' || saved?.aspectRatio === '16:9') {
          setAspectRatio(saved.aspectRatio);
        } else if (
          videoItem.isShort ||
          (preview.height && preview.width && preview.height > preview.width)
        ) {
          setAspectRatio('9:16');
        } else if (preview.width && preview.height && preview.width >= preview.height) {
          setAspectRatio('16:9');
        }
      } catch (err: any) {
        // Ignora erros decorrentes de cancelamento intencional da requisição
        if (
          err?.name === 'CanceledError' ||
          err?.code === 'ERR_CANCELED' ||
          abortController.signal.aborted
        ) {
          return;
        }

        console.error('Erro ao baixar vídeo para preview no Studio:', err);
        const rawMsg =
          err?.response?.data?.message ||
          (err?.code === 'ECONNABORTED'
            ? 'Tempo limite de download excedido. O vídeo é longo ou a conexão está lenta.'
            : 'Não foi possível baixar o vídeo selecionado para visualização em tempo real.');
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
        if (inFlightVideoUrlRef.current === videoUrl) {
          inFlightVideoUrlRef.current = null;
        }
        setIsPreparingPreview(false);
      }
    },
    []
  );

  // Carrega vídeo atual estritamente quando a URL mudar
  useEffect(() => {
    const videoUrl = currentVideo?.url;
    if (videoUrl) {
      if (lastAttemptedUrlRef.current !== videoUrl) {
        loadVideoPreview(currentVideo);
      }
    } else {
      lastAttemptedUrlRef.current = null;
      inFlightVideoUrlRef.current = null;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
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
    pauseVideo,
    initialSeekTimeRef,
    lastTimeRef,
    handleTimelineMouseDown,
    handleTimelineClick,
    loadVideoPreview,
  };
};
