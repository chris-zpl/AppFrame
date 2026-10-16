import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../lib/api';
import { watermarksService } from '../features/watermarks';
import {
  mediaService,
  type CreateVideoJobPayload,
  type StudioVideoQueueItem,
  type SubtitleLineData,
  type SubtitleSegmentData,
} from '../features/history';
import { toast } from 'sonner';

import {
  StudioVideoQueue,
  StudioHeader,
  StudioPlayer,
  StudioTimeline,
  StudioSubtitlesTab,
  StudioWatermarkTab,
  StudioDeleteModal,
  type AspectRatio,
  type SubtitleMode,
  type FontFamily,
  type WatermarkPosition,
  wrapCanvasText,
  useStudioSubtitles,
} from '../features/studio';

export type { AspectRatio, SubtitleMode, FontFamily, WatermarkPosition };

export const StudioPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fila de vídeos selecionados na Varredura (aguardando em lista caso mais de um seja selecionado)
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
  const currentVideo = videoQueue[activeQueueIndex] || null;

  // Estados do download e stream real do vídeo no Studio
  const [isPreparingPreview, setIsPreparingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewStreamUrl, setPreviewStreamUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Identifica se o erro é decorrente de restrição de idade ou necessidade de autenticação/cookies do YouTube
  const isAuthError = Boolean(
    previewError &&
      (previewError.toLowerCase().includes('sign in') ||
        previewError.toLowerCase().includes('confirm your age') ||
        previewError.toLowerCase().includes('cookies') ||
        previewError.toLowerCase().includes("not a bot") ||
        previewError.toLowerCase().includes('restrição de idade') ||
        previewError.toLowerCase().includes('conta global') ||
        previewError.toLowerCase().includes('authentication') ||
        previewError.toLowerCase().includes('login')),
  );

  // Consulta real de marcas d'água cadastradas
  const { data: userWatermarks = [], isLoading: isLoadingWatermarks } = useQuery({
    queryKey: ['watermarks'],
    queryFn: watermarksService.list,
  });

  // Consulta real do status de vinculação da conta Google AI Studio (Gemini)
  const { data: geminiStatus, isLoading: isLoadingGeminiStatus } = useQuery({
    queryKey: ['gemini-status'],
    queryFn: mediaService.getGeminiStatus,
  });

  const isGeminiConnected = Boolean(geminiStatus?.connected);

  // Estados de Exclusão do Studio
  const [isDeleteStudioModalOpen, setIsDeleteStudioModalOpen] = useState<boolean>(false);
  const [isDeletingFromStudio, setIsDeletingFromStudio] = useState<boolean>(false);

  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);

  // Configurações Globais do Player e Formato (sem valores mockados)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0.0);
  const [totalDuration, setTotalDuration] = useState<number>(0.0);

  // Timeline & Cortes de Precisão (In, Out e Onda Sonora Real do Vídeo)
  const [trimIn, setTrimIn] = useState<number>(0.0);
  const [trimOut, setTrimOut] = useState<number>(0.0);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'legendas' | 'marca-dagua'>('legendas');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);

  // Configurações da Aba Legendas (sem dados mockados)
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('static');
  const [staticText, setStaticText] = useState<string>(
    currentVideo?.title || params.videoTitle || ''
  );
  const [geminiPrompt, setGeminiPrompt] = useState<string>(
    currentVideo?.title || params.videoTitle || ''
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>('Plus Jakarta Sans');
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [bgColor, setBgColor] = useState<string>('#10131A');
  const [strokeColor, setStrokeColor] = useState<string>('#000000');
  const [fontSize, setFontSize] = useState<number>(28);
  const [useBackgroundBox, setUseBackgroundBox] = useState<boolean>(true);

  // Hook de Legendas e Transcrição Gemini
  const {
    isGeneratingSubtitles,
    isTranscribingAudio,
    showAdvancedGeminiOptions,
    setShowAdvancedGeminiOptions,
    dynamicSegments,
    setDynamicSegments,
    selectedMediaFile,
    setSelectedMediaFile,
    handleGenerateGeminiSubtitles,
    handleTranscribeCurrentVideo,
  } = useStudioSubtitles({
    isGeminiConnected,
    videoTitle: params.videoTitle || currentVideo?.title,
    currentVideoUrl: currentVideo?.url || params.videoUrl || params.sourceUrl,
    currentPreviewId,
    trimIn,
    trimOut,
    totalDuration,
    setSubtitleMode,
    setCurrentTime,
  });

  // Garante que o modo dinâmico fique bloqueado caso o Gemini não esteja configurado
  useEffect(() => {
    if (!isLoadingGeminiStatus && !isGeminiConnected && subtitleMode === 'dynamic') {
      setSubtitleMode('static');
    }
  }, [isLoadingGeminiStatus, isGeminiConnected, subtitleMode]);

  // Configurações da Aba Marca d'Água
  const [selectedWatermarkId, setSelectedWatermarkId] = useState<string>('none');
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('top-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(85);
  const [watermarkScale, setWatermarkScale] = useState<number>(100);

  const hasAutoSelectedWatermarkRef = useRef<boolean>(false);

  // Seleciona automaticamente a primeira marca d'água na carga inicial apenas se não houver preferência salva
  useEffect(() => {
    if (hasAutoSelectedWatermarkRef.current) return;
    if (userWatermarks.length === 0) return;

    // Só auto-seleciona se o vídeo atual NÃO possuir nenhuma preferência salva no localStorage
    const storageKey = currentVideo ? `appframe_studio_state_${currentVideo.id || currentVideo.url}` : null;
    let hasSavedWatermark = false;
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.selectedWatermarkId !== undefined) {
            hasSavedWatermark = true;
          }
        }
      } catch {}
    }

    if (!hasSavedWatermark) {
      setSelectedWatermarkId(userWatermarks[0].id);
    }
    hasAutoSelectedWatermarkRef.current = true;
  }, [userWatermarks, currentVideo]);

  const selectedLogo = useMemo(() => {
    if (!selectedWatermarkId || selectedWatermarkId === 'none') return null;
    return userWatermarks.find((w) => w.id === selectedWatermarkId) || null;
  }, [userWatermarks, selectedWatermarkId]);

  // Referências
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const draggingHandleRef = useRef<'in' | 'out' | 'playhead' | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Renderização determinística no Canvas com cálculo estrito de quebra de linha (fix_bounds)
  const drawCanvasOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Limpa quadro anterior
    ctx.clearRect(0, 0, width, height);

    // Só desenha legendas e marca d'água quando o vídeo real estiver pronto no player
    if (!previewStreamUrl || isPreparingPreview || previewError) {
      return;
    }

    // ==========================================
    // 1. RENDERIZAÇÃO DA LEGENDA COM FIX_BOUNDS
    // Margem mínima de segurança safePadding >= 48px
    // ==========================================
    const safePadding = Math.max(48, width * 0.08);
    const maxTextWidth = width - safePadding * 2;

    ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;

    const wrapText = (text: string, maxWidth: number): string[] => {
      return wrapCanvasText(ctx, text, maxWidth);
    };

    let displayLines: string[] = [];
    let highlightWord = '';

    if (subtitleMode === 'static') {
      if (staticText.trim()) {
        displayLines = wrapText(staticText, maxTextWidth);
      }
    } else if (dynamicSegments.length > 0) {
      // Modo Legenda Dinâmica (Gemini real): exibe o segmento ativo no currentTime (ou o primeiro segmento se fora da faixa)
      const activeSeg =
        dynamicSegments.find((s) => currentTime >= s.start && currentTime <= s.end) ||
        dynamicSegments.find((s) => Math.abs(s.start - currentTime) <= 1.5) ||
        dynamicSegments[0];

      if (activeSeg && activeSeg.text) {
        const segWords = activeSeg.text.trim().split(/\s+/).filter(Boolean);
        if (segWords.length > 0) {
          const segDuration = Math.max(0.2, activeSeg.end - activeSeg.start);
          const progress = Math.max(0, Math.min(0.999, (currentTime - activeSeg.start) / segDuration));
          const wordIdx = Math.floor(progress * segWords.length);
          highlightWord = segWords[wordIdx] || '';
        }
        displayLines = wrapText(activeSeg.text, maxTextWidth);
      }
    }

    // Desenha as linhas de legenda no canvas
    if (displayLines.length > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;

      // Posicionamento vertical: inferior (72% da altura em 9:16, 78% em 16:9)
      const startY = height * (aspectRatio === '9:16' ? 0.72 : 0.78);
      const lineHeight = fontSize * 1.35;

      displayLines.forEach((line, index) => {
        const lineY = startY + index * lineHeight;
        const lineMetrics = ctx.measureText(line);
        const paddingX = 14;
        const paddingY = 8;
        const boxWidth = Math.min(lineMetrics.width + paddingX * 2, width - 24);
        const boxHeight = fontSize + paddingY;

        // Fundo com caixa arredondada se habilitado
        if (useBackgroundBox) {
          ctx.save();
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          const rx = width / 2 - boxWidth / 2;
          const ry = lineY - boxHeight / 2;
          ctx.roundRect(rx, ry, boxWidth, boxHeight, 8);
          ctx.fill();
          ctx.restore();
        }

        // Contorno da legenda para legibilidade
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = strokeColor;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, width / 2, lineY);

        // Texto principal
        ctx.fillStyle = textColor;
        ctx.fillText(line, width / 2, lineY);

        // Destaque âmbar para palavra dinâmica ativa
        if (highlightWord && line.toLowerCase().includes(highlightWord.toLowerCase())) {
          ctx.fillStyle = '#F2BE5E';
          ctx.fillText(line, width / 2, lineY);
        }
        ctx.restore();
      });
    }

    // ==========================================
    // 2. RENDERIZAÇÃO REAL DA MARCA D'ÁGUA NO CANVAS COM ALFA
    // ==========================================
    if (selectedLogo && selectedLogo.url) {
      let img = imageCacheRef.current.get(selectedLogo.url);
      if (!img) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = selectedLogo.url;
        img.onload = () => {
          drawCanvasOverlay();
        };
        imageCacheRef.current.set(selectedLogo.url, img);
      }

      if (img.complete && img.naturalWidth > 0) {
        const scale = watermarkScale / 100;
        const aspect = img.naturalWidth / img.naturalHeight;
        const baseLogoWidth = Math.min(width * 0.35, 110 * scale);
        const baseLogoHeight = baseLogoWidth / aspect;
        const padding = 20;

        let x = padding;
        let y = padding;

        // Cálculo de coordenadas da Matriz 3x3
        if (watermarkPosition.includes('left')) {
          x = padding;
        } else if (watermarkPosition.includes('right')) {
          x = width - baseLogoWidth - padding;
        } else {
          x = width / 2 - baseLogoWidth / 2;
        }

        if (watermarkPosition.includes('top')) {
          y = padding;
        } else if (watermarkPosition.includes('bottom')) {
          y = height - baseLogoHeight - padding;
        } else {
          y = height / 2 - baseLogoHeight / 2;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, watermarkOpacity / 100));
        ctx.drawImage(img, x, y, baseLogoWidth, baseLogoHeight);
        ctx.restore();
      }
    }
  }, [
    aspectRatio,
    subtitleMode,
    staticText,
    dynamicSegments,
    fontFamily,
    fontSize,
    textColor,
    bgColor,
    strokeColor,
    useBackgroundBox,
    selectedLogo,
    watermarkPosition,
    watermarkOpacity,
    watermarkScale,
    currentTime,
    previewStreamUrl,
    isPreparingPreview,
    previewError,
  ]);

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

  // Baixa o vídeo selecionado na Varredura para visualização e edição em tempo real no Studio
  const loadVideoPreview = useCallback(async (videoItem: StudioVideoQueueItem) => {
    setIsPlaying(false);
    setIsPreparingPreview(true);
    setPreviewError(null);
    setPreviewStreamUrl(null);
    setWaveformPeaks([]);
    setTotalDuration(0.0);
    setTrimIn(0.0);
    setTrimOut(0.0);
    setCurrentTime(0.0);

    const storageKey = videoItem ? `appframe_studio_state_${videoItem.id || videoItem.url}` : null;
    let saved: any = null;
    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) saved = JSON.parse(raw);
      } catch {}
    }

    if (saved?.staticText !== undefined) setStaticText(saved.staticText);
    else setStaticText(videoItem.title || '');

    if (saved?.geminiPrompt !== undefined) setGeminiPrompt(saved.geminiPrompt);
    else setGeminiPrompt(videoItem.title || '');

    if (Array.isArray(saved?.dynamicSegments)) setDynamicSegments(saved.dynamicSegments);
    else setDynamicSegments([]);

    if (saved?.subtitleMode) setSubtitleMode(saved.subtitleMode);
    if (saved?.fontFamily) setFontFamily(saved.fontFamily);
    if (saved?.textColor) setTextColor(saved.textColor);
    if (saved?.bgColor) setBgColor(saved.bgColor);
    if (saved?.strokeColor) setStrokeColor(saved.strokeColor);
    if (typeof saved?.fontSize === 'number') setFontSize(saved.fontSize);
    if (typeof saved?.useBackgroundBox === 'boolean') setUseBackgroundBox(saved.useBackgroundBox);
    if (saved?.selectedWatermarkId !== undefined) {
      setSelectedWatermarkId(saved.selectedWatermarkId);
    } else if (userWatermarks.length > 0) {
      setSelectedWatermarkId(userWatermarks[0].id);
    } else {
      setSelectedWatermarkId('none');
    }
    hasAutoSelectedWatermarkRef.current = true;
    if (saved?.watermarkPosition) setWatermarkPosition(saved.watermarkPosition);
    if (typeof saved?.watermarkOpacity === 'number') setWatermarkOpacity(saved.watermarkOpacity);
    if (typeof saved?.watermarkScale === 'number') setWatermarkScale(saved.watermarkScale);

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
      setIsPreparingPreview(false);
    }
  }, []);

  useEffect(() => {
    if (currentVideo?.url) {
      loadVideoPreview(currentVideo);
    }
  }, [currentVideo?.id, currentVideo?.url, loadVideoPreview]);

  // Persiste automaticamente as configurações do Studio no localStorage para o vídeo atual
  useEffect(() => {
    if (!currentVideo || isPreparingPreview || totalDuration <= 0) return;
    const storageKey = `appframe_studio_state_${currentVideo.id || currentVideo.url}`;

    const stateToSave = {
      trimIn,
      trimOut,
      aspectRatio,
      subtitleMode,
      staticText,
      geminiPrompt,
      fontFamily,
      textColor,
      bgColor,
      strokeColor,
      fontSize,
      useBackgroundBox,
      selectedWatermarkId,
      watermarkPosition,
      watermarkOpacity,
      watermarkScale,
      dynamicSegments,
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch {}
  }, [
    currentVideo,
    isPreparingPreview,
    totalDuration,
    trimIn,
    trimOut,
    aspectRatio,
    subtitleMode,
    staticText,
    geminiPrompt,
    fontFamily,
    textColor,
    bgColor,
    strokeColor,
    fontSize,
    useBackgroundBox,
    selectedWatermarkId,
    watermarkPosition,
    watermarkOpacity,
    watermarkScale,
    dynamicSegments,
  ]);

  // Restaura todas as configurações do Studio para o padrão de fábrica
  const handleResetStudio = () => {
    if (!currentVideo) return;
    const storageKey = `appframe_studio_state_${currentVideo.id || currentVideo.url}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {}

    setTrimIn(0.0);
    setTrimOut(totalDuration > 0 ? totalDuration : 0.0);
    setAspectRatio(currentVideo.isShort ? '9:16' : '16:9');
    setSubtitleMode('static');
    setStaticText(currentVideo.title || '');
    setGeminiPrompt(currentVideo.title || '');
    setDynamicSegments([]);
    setFontFamily('Plus Jakarta Sans');
    setTextColor('#FFFFFF');
    setBgColor('#10131A');
    setStrokeColor('#000000');
    setFontSize(28);
    setUseBackgroundBox(true);
    hasAutoSelectedWatermarkRef.current = true;
    setSelectedWatermarkId(userWatermarks[0]?.id || 'none');
    setWatermarkPosition('top-right');
    setWatermarkOpacity(85);
    setWatermarkScale(100);
    seekVideoTo(0.0);

    toast.success('Configurações do Studio restauradas para o padrão de fábrica.');
  };

  // Remove o vídeo atual do Studio, limpa o arquivo temporário no backend e carrega o próximo vídeo (se houver)
  const handleDeleteFromStudio = async () => {
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
      setPreviewStreamUrl(null);
      setWaveformPeaks([]);
      setTotalDuration(0.0);
      setTrimIn(0.0);
      setTrimOut(0.0);
      setCurrentTime(0.0);
      setStaticText('');
      setGeminiPrompt('');
      setDynamicSegments([]);
      toast.success('Vídeo temporário removido do Studio.');
    }
  };

  // Atualização do canvas em tempo real
  useEffect(() => {
    drawCanvasOverlay();
  }, [drawCanvasOverlay]);

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

  // Ação de Conclusão: "Gerar Vídeo", salvar no Histórico e baixar para o computador com mensagem no Sonner
  const handleGenerateVideo = async () => {
    let rawSourceUrl = currentVideo?.url || params.videoUrl || params.sourceUrl;
    if (!rawSourceUrl && params.selectedVideos) {
      rawSourceUrl = params.selectedVideos.startsWith('http')
        ? params.selectedVideos
        : `https://www.youtube.com/watch?v=${params.selectedVideos}`;
    }

    if (!rawSourceUrl) {
      toast.error('Selecione um vídeo na Varredura antes de iniciar a renderização.');
      return;
    }

    if (subtitleMode === 'dynamic' && !isGeminiConnected) {
      toast.error('O assistente de inteligência artificial (Gemini) não está configurado na plataforma.');
      return;
    }

    setIsPlaying(false);
    setIsGenerating(true);
    setRenderProgress(5);

    try {
      const isUuid = (val?: string) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      const originalTitle =
        currentVideo?.title ||
        params.videoTitle ||
        selectedMediaFile?.name ||
        (params.selectedVideos ? `Vídeo ${params.selectedVideos}` : 'Corte de Vídeo AppFrame');

      const resolvedSubtitleText =
        subtitleMode === 'static'
          ? staticText
          : dynamicSegments.length > 0
            ? dynamicSegments.map((s) => s.text).join(' ')
            : geminiPrompt;

      // Medição precisa no mesmo padrão do canvas de preview do Studio
      const previewCanvasWidth = aspectRatio === '9:16' ? 360 : 640;
      const previewSafePadding = Math.max(48, previewCanvasWidth * 0.08);
      const previewMaxTextWidth = previewCanvasWidth - previewSafePadding * 2;

      const measureCanvas = document.createElement('canvas');
      const measureCtx = measureCanvas.getContext('2d');
      if (measureCtx) {
        measureCtx.font = `bold ${fontSize}px "${fontFamily}", sans-serif`;
      }

      const wrapAndMeasure = (textToWrap: string): SubtitleLineData[] => {
        if (!textToWrap.trim()) return [];
        const words = textToWrap.trim().split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';

        for (const w of words) {
          if (!w) continue;
          const testLine = currentLine ? `${currentLine} ${w}` : w;
          const metrics = measureCtx
            ? measureCtx.measureText(testLine).width
            : testLine.length * fontSize * 0.55;
          if (metrics > previewMaxTextWidth && currentLine) {
            lines.push(currentLine);
            currentLine = w;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }

        return lines.map((l) => ({
          text: l,
          width: measureCtx ? Math.round(measureCtx.measureText(l).width) : undefined,
        }));
      };

      const staticLinesData: SubtitleLineData[] | undefined =
        subtitleMode === 'static' ? wrapAndMeasure(staticText) : undefined;

      const dynamicSegmentsData: SubtitleSegmentData[] | undefined =
        subtitleMode === 'dynamic' && dynamicSegments.length > 0
          ? dynamicSegments.map((seg) => ({
              start: seg.start,
              end: seg.end,
              text: seg.text,
              lines: wrapAndMeasure(seg.text),
            }))
          : undefined;

      const payload: CreateVideoJobPayload = {
        source_url: rawSourceUrl,
        platform: 'youtube',
        original_title: originalTitle,
        aspect_ratio: aspectRatio,
        trim_start: Number(trimIn.toFixed(2)),
        trim_end: Number(trimOut.toFixed(2)),
        watermark_id: isUuid(selectedWatermarkId) ? selectedWatermarkId : undefined,
        watermark_position: isUuid(selectedWatermarkId) ? watermarkPosition : undefined,
        watermark_scale: isUuid(selectedWatermarkId) ? watermarkScale : undefined,
        watermark_opacity: isUuid(selectedWatermarkId) ? watermarkOpacity : undefined,
        subtitle_config: {
          mode: subtitleMode,
          text: resolvedSubtitleText,
          lines: staticLinesData,
          segments: dynamicSegmentsData,
          font_family: fontFamily,
          font_size: fontSize,
          text_color: textColor,
          background_color: bgColor,
          stroke_color: strokeColor,
          use_background_box: useBackgroundBox,
        },
      };

      const createdJob = await mediaService.render(payload);
      setRenderProgress(15);

      // Aguarda a conclusão do processamento FFmpeg no backend para baixar o vídeo no computador e registrar no Histórico
      let currentJob = createdJob;
      const maxAttempts = 180; // até ~4.5 minutos
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const st = String(currentJob.status || '').toUpperCase();
        if (st === 'COMPLETED' || st === 'FAILED') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
        currentJob = await mediaService.getJobById(createdJob.id);
        if (typeof currentJob.progress === 'number') {
          setRenderProgress(Math.max(15, currentJob.progress));
        }
      }

      const finalStatus = String(currentJob.status || '').toUpperCase();
      if (finalStatus === 'FAILED') {
        throw new Error(
          currentJob.error_log || 'Falha durante a renderização do vídeo pelo FFmpeg.'
        );
      }

      if (finalStatus !== 'COMPLETED') {
        throw new Error('O tempo limite de renderização foi atingido. Verifique o Histórico.');
      }

      setRenderProgress(100);

      // Atualiza o cache do Histórico imediatamente
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });

      // Faz o download automático do vídeo gerado para o computador do usuário
      await mediaService.downloadJobFile(
        currentJob.id,
        currentJob.original_title || originalTitle
      );

      toast.success(
        'Vídeo gerado com sucesso, salvo no histórico e baixado para o seu computador!'
      );

      // Marca o vídeo atual como concluído na fila de espera
      const finishedId = currentVideo?.id || '';
      const updatedCompleted = finishedId
        ? Array.from(new Set([...completedVideoIds, finishedId]))
        : completedVideoIds;
      setCompletedVideoIds(updatedCompleted);

      // Verifica se há mais vídeos aguardando na lista selecionada na Varredura
      const nextWaitingIndex = videoQueue.findIndex(
        (item, idx) => idx !== activeQueueIndex && !updatedCompleted.includes(item.id)
      );

      if (nextWaitingIndex !== -1) {
        setActiveQueueIndex(nextWaitingIndex);
        toast.info(
          `Carregando próximo vídeo da fila (${nextWaitingIndex + 1} de ${videoQueue.length}): "${videoQueue[nextWaitingIndex].title}"`
        );
      } else {
        sessionStorage.removeItem('appframe_studio_queue');
        navigate('historico', {
          jobCreated: 'true',
          jobId: currentJob.id,
          title: currentJob.original_title || originalTitle,
        });
      }
    } catch (err: any) {
      console.error('Falha ao gerar e baixar vídeo:', err);
      const rawMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Falha ao gerar o vídeo. Verifique os parâmetros e tente novamente.';
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

      toast.error(friendlyMsg);
    } finally {
      setIsGenerating(false);
      setRenderProgress(0);
    }
  };

  const studioProjectTitle =
    currentVideo?.title ||
    params.videoTitle ||
    selectedMediaFile?.name ||
    'Nenhum vídeo selecionado na Varredura';

  return (
    <AppShell
      currentPath="studio"
      onNavigate={(path) => navigate(path)}
      userName={user?.name || ''}
      onUserAvatarClick={() => navigate('configuracoes')}
    >
      <div className="flex flex-col w-full text-on-surface pb-8">
        {/* ================= BARRA SUPERIOR DE CONTROLE DO STUDIO ================= */}
        <StudioHeader
          studioProjectTitle={studioProjectTitle}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          videoQueueLength={videoQueue.length}
          activeQueueIndex={activeQueueIndex}
          hasCurrentVideo={Boolean(currentVideo)}
          isPreparingPreview={isPreparingPreview}
          isGenerating={isGenerating}
          renderProgress={renderProgress}
          onNavigateBack={() => navigate('varredura')}
          onResetStudio={handleResetStudio}
          onOpenDeleteModal={() => setIsDeleteStudioModalOpen(true)}
          onGenerateVideo={handleGenerateVideo}
        />

        {/* ================= FILA DE VÍDEOS PENDENTES (SELECIONADOS NA VARREDURA) ================= */}
        <StudioVideoQueue
          videoQueue={videoQueue}
          activeQueueIndex={activeQueueIndex}
          completedVideoIds={completedVideoIds}
          isGenerating={isGenerating}
          isPreparingPreview={isPreparingPreview}
          onSelectVideo={setActiveQueueIndex}
        />

        {/* ================= CORPO PRINCIPAL DO STUDIO ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          {/* LADO ESQUERDO: PLAYER + TIMELINE (8 COLUNAS) */}
          <div className="lg:col-span-8 flex flex-col gap-space-md">
            <StudioPlayer
              currentVideo={currentVideo}
              aspectRatio={aspectRatio}
              previewStreamUrl={previewStreamUrl}
              isPreparingPreview={isPreparingPreview}
              previewError={previewError}
              isAuthError={isAuthError}
              videoRef={videoRef}
              canvasRef={canvasRef}
              isPlaying={isPlaying}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              currentTime={currentTime}
              totalDuration={totalDuration}
              trimIn={trimIn}
              trimOut={trimOut}
              setTotalDuration={setTotalDuration}
              setTrimOut={setTrimOut}
              setCurrentTime={setCurrentTime}
              setIsPlaying={setIsPlaying}
              handleTogglePlay={handleTogglePlay}
              seekVideoTo={seekVideoTo}
              loadVideoPreview={loadVideoPreview}
              onNavigateToVarredura={() => navigate('varredura')}
            />

            <StudioTimeline
              trimIn={trimIn}
              trimOut={trimOut}
              currentTime={currentTime}
              totalDuration={totalDuration}
              waveformPeaks={waveformPeaks}
              isPreparingPreview={isPreparingPreview}
              previewError={previewError}
              timelineRef={timelineRef}
              handleTimelineClick={handleTimelineClick}
              handleTimelineMouseDown={handleTimelineMouseDown}
              setTrimIn={setTrimIn}
              setTrimOut={setTrimOut}
            />
          </div>

          {/* LADO DIREITO: ABAS DE CUSTOMIZAÇÃO (4 COLUNAS) */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <Card className="bg-surface-container-low border border-surface-container-high/90 p-4 shadow-xl flex flex-col gap-4">
              {/* Abas Superiores do Painel Lateral */}
              <div className="flex items-center p-1 rounded-xl bg-surface-container border border-surface-container-highest">
                <button
                  type="button"
                  onClick={() => setActiveTab('legendas')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-title-sm text-title-sm transition-all cursor-pointer',
                    activeTab === 'legendas'
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">subtitles</span>
                  <span>Legendas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('marca-dagua')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-title-sm text-title-sm transition-all cursor-pointer',
                    activeTab === 'marca-dagua'
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  <span className="material-symbols-outlined text-[18px]">branding_watermark</span>
                  <span>Marca d'Água</span>
                </button>
              </div>

              {/* ABA 1: CONFIGURAÇÕES DE LEGENDA */}
              {activeTab === 'legendas' && (
                <StudioSubtitlesTab
                  isGeminiConnected={isGeminiConnected}
                  subtitleMode={subtitleMode}
                  setSubtitleMode={setSubtitleMode}
                  staticText={staticText}
                  setStaticText={setStaticText}
                  isTranscribingAudio={isTranscribingAudio}
                  isGeneratingSubtitles={isGeneratingSubtitles}
                  hasCurrentVideo={Boolean(currentVideo)}
                  trimIn={trimIn}
                  trimOut={trimOut}
                  totalDuration={totalDuration}
                  handleTranscribeCurrentVideo={handleTranscribeCurrentVideo}
                  showAdvancedGeminiOptions={showAdvancedGeminiOptions}
                  setShowAdvancedGeminiOptions={setShowAdvancedGeminiOptions}
                  geminiPrompt={geminiPrompt}
                  setGeminiPrompt={setGeminiPrompt}
                  mediaFileInputRef={mediaFileInputRef}
                  selectedMediaFile={selectedMediaFile}
                  setSelectedMediaFile={setSelectedMediaFile}
                  handleGenerateGeminiSubtitles={handleGenerateGeminiSubtitles}
                  dynamicSegments={dynamicSegments}
                  currentTime={currentTime}
                  setCurrentTime={setCurrentTime}
                  fontFamily={fontFamily}
                  setFontFamily={setFontFamily}
                  textColor={textColor}
                  setTextColor={setTextColor}
                  strokeColor={strokeColor}
                  setStrokeColor={setStrokeColor}
                  bgColor={bgColor}
                  setBgColor={setBgColor}
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  useBackgroundBox={useBackgroundBox}
                  setUseBackgroundBox={setUseBackgroundBox}
                />
              )}

              {/* ABA 2: MARCA D'ÁGUA */}
              {activeTab === 'marca-dagua' && (
                <StudioWatermarkTab
                  userWatermarks={userWatermarks}
                  isLoadingWatermarks={isLoadingWatermarks}
                  selectedWatermarkId={selectedWatermarkId}
                  setSelectedWatermarkId={setSelectedWatermarkId}
                  watermarkPosition={watermarkPosition}
                  setWatermarkPosition={setWatermarkPosition}
                  watermarkOpacity={watermarkOpacity}
                  setWatermarkOpacity={setWatermarkOpacity}
                  watermarkScale={watermarkScale}
                  setWatermarkScale={setWatermarkScale}
                  onNavigateToWatermarks={() => navigate('marcas')}
                />
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão do Studio */}
      <StudioDeleteModal
        isOpen={isDeleteStudioModalOpen}
        isLoading={isDeletingFromStudio}
        currentVideo={currentVideo}
        onClose={() => setIsDeleteStudioModalOpen(false)}
        onConfirm={async () => {
          setIsDeletingFromStudio(true);
          try {
            await handleDeleteFromStudio();
            setIsDeleteStudioModalOpen(false);
          } finally {
            setIsDeletingFromStudio(false);
          }
        }}
      />
    </AppShell>
  );
};
