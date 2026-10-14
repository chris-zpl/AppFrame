import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { AppShell } from '../components/layout/AppShell';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../services/api';
import { watermarksService } from '../services/watermarks.service';
import {
  mediaService,
  type CreateVideoJobPayload,
  type GeminiSubtitleSegment,
  type StudioVideoQueueItem,
  type SubtitleLineData,
  type SubtitleSegmentData,
} from '../services/media.service';
import { toast } from 'sonner';

export type AspectRatio = '9:16' | '16:9';
export type SubtitleMode = 'static' | 'dynamic';
export type FontFamily = 'Plus Jakarta Sans' | 'Montserrat' | 'Bebas Neue' | 'Anton';
export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export const StudioPage: React.FC = () => {
  const { navigate, params } = useNavigation();
  const { user, refreshProfile } = useAuth();
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

  const isGeminiConnected = Boolean(geminiStatus?.connected ?? user?.has_gemini_key);

  // Estados do Modal BYOK (Vinculação de Conta Google AI Studio)
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isConnectingGemini, setIsConnectingGemini] = useState<boolean>(false);
  const [isDisconnectingGemini, setIsDisconnectingGemini] = useState<boolean>(false);
  const [isDeleteStudioModalOpen, setIsDeleteStudioModalOpen] = useState<boolean>(false);
  const [isDeletingFromStudio, setIsDeletingFromStudio] = useState<boolean>(false);

  // Estados reais do Gerador de Legendas Gemini
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState<boolean>(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState<boolean>(false);
  const [showAdvancedGeminiOptions, setShowAdvancedGeminiOptions] = useState<boolean>(false);
  const [dynamicSegments, setDynamicSegments] = useState<GeminiSubtitleSegment[]>([]);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
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

  // Garante que o modo dinâmico fique bloqueado caso a conta não esteja conectada
  useEffect(() => {
    if (!isLoadingGeminiStatus && !isGeminiConnected && subtitleMode === 'dynamic') {
      setSubtitleMode('static');
    }
  }, [isLoadingGeminiStatus, isGeminiConnected, subtitleMode]);

  // Ação real: Conectar conta Google AI Studio (BYOK)
  const handleConnectGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = geminiApiKeyInput.trim();
    if (!cleanKey) {
      toast.error('Cole sua chave de API do Google AI Studio para conectar.');
      return;
    }

    setIsConnectingGemini(true);
    try {
      await mediaService.connectGeminiAccount(cleanKey);
      await queryClient.invalidateQueries({ queryKey: ['gemini-status'] });
      await refreshProfile();
      setGeminiApiKeyInput('');
      setIsGeminiModalOpen(false);
      setSubtitleMode('dynamic');
      toast.success('Conta do Google AI Studio conectada! Gerador de legendas Gemini habilitado.');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Não foi possível validar a chave no Google Gemini. Verifique e tente novamente.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsConnectingGemini(false);
    }
  };

  // Ação real: Desconectar conta Google AI Studio
  const handleDisconnectGemini = async () => {
    setIsDisconnectingGemini(true);
    try {
      await mediaService.disconnectGeminiAccount();
      await queryClient.invalidateQueries({ queryKey: ['gemini-status'] });
      await refreshProfile();
      setSubtitleMode('static');
      setDynamicSegments([]);
      toast.success('Conta do Google AI Studio desconectada com sucesso.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao desconectar conta do Gemini.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsDisconnectingGemini(false);
    }
  };

  // Ação real: Gerar legendas sincronizadas pelo Gemini no backend
  const handleGenerateGeminiSubtitles = async () => {
    if (!isGeminiConnected) {
      setIsGeminiModalOpen(true);
      return;
    }

    const contextToUse = geminiPrompt.trim() || params.videoTitle || '';
    if (!selectedMediaFile && !contextToUse) {
      toast.error(
        'Selecione um arquivo de áudio/vídeo ou descreva o tema/roteiro do vídeo para gerar as legendas pelo Gemini.'
      );
      return;
    }

    setIsGeneratingSubtitles(true);
    try {
      const result = await mediaService.generateGeminiSubtitles({
        file: selectedMediaFile,
        title: params.videoTitle,
        context: contextToUse,
        durationSeconds: Math.max(5, Math.round(trimOut - trimIn)),
        language: 'pt-BR',
      });

      if (result.segments && result.segments.length > 0) {
        setDynamicSegments(result.segments);
        setSubtitleMode('dynamic');
        setCurrentTime(result.segments[0].start);
        toast.success(
          `${result.segments.length} blocos de legenda gerados com sucesso pelo Google Gemini!`
        );
      } else {
        toast.error('O Gemini não retornou segmentos de legenda para o conteúdo informado.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Falha ao gerar legendas pelo Google Gemini. Verifique sua conexão e cota da conta.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsGeneratingSubtitles(false);
    }
  };

  // Ação real: Transcrever áudio do vídeo atual via Gemini (reconhecimento de fala real STT)
  const handleTranscribeCurrentVideo = async () => {
    if (!isGeminiConnected) {
      setIsGeminiModalOpen(true);
      return;
    }

    const videoUrl = currentVideo?.url || params.videoUrl || params.sourceUrl;
    if (!videoUrl && !selectedMediaFile && !currentPreviewId) {
      toast.error('Nenhum vídeo carregado no Studio para transcrição.');
      return;
    }

    setIsTranscribingAudio(true);
    try {
      const result = await mediaService.generateGeminiSubtitles({
        file: selectedMediaFile,
        previewId: currentPreviewId || undefined,
        sourceUrl: videoUrl || undefined,
        trimStart: trimIn > 0 ? trimIn : undefined,
        trimEnd: trimOut > 0 && trimOut < totalDuration ? trimOut : undefined,
        language: 'pt-BR',
      });

      if (result.segments && result.segments.length > 0) {
        setDynamicSegments(result.segments);
        setSubtitleMode('dynamic');
        setCurrentTime(result.segments[0].start);
        toast.success(
          `Transcrição concluída! ${result.segments.length} blocos de fala sincronizados com o áudio do vídeo.`
        );
      } else {
        toast.info(
          'Nenhuma fala foi detectada no áudio do vídeo. Caso o vídeo não possua narração, você pode gerar legendas por roteiro nas outras opções.'
        );
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Falha ao transcrever áudio do vídeo pelo Google Gemini. Verifique sua conexão e tente novamente.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsTranscribingAudio(false);
    }
  };

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

  // Formatação de cronômetro com precisão tabular (MM:SS ou MM:SS.mmm)
  const formatTime = (seconds: number, includeMs: boolean = false): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    const base = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    if (includeMs) {
      return `${base}.${String(ms).padStart(3, '0')}`;
    }
    return base;
  };

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
      const words = text.trim().split(/\s+/);
      const lines: string[] = [];
      let currentLine = '';

      for (const w of words) {
        if (!w) continue;
        const testLine = currentLine ? `${currentLine} ${w}` : w;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = w;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
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
      const msg =
        err?.response?.data?.message ||
        'Não foi possível baixar o vídeo selecionado para visualização em tempo real.';
      setPreviewError(Array.isArray(msg) ? msg[0] : msg);
      toast.error(Array.isArray(msg) ? msg[0] : msg);
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
      toast.error('Conecte sua conta do Google AI Studio (Gemini) para usar legendas dinâmicas.');
      setIsGeminiModalOpen(true);
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
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Falha ao gerar o vídeo. Verifique os parâmetros e tente novamente.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsGenerating(false);
      setRenderProgress(0);
    }
  };

  // Posições da Matriz 3x3
  const MATRIX_POSITIONS: { key: WatermarkPosition; label: string; icon: string }[] = [
    { key: 'top-left', label: 'Superior Esquerdo', icon: 'north_west' },
    { key: 'top-center', label: 'Superior Centro', icon: 'north' },
    { key: 'top-right', label: 'Superior Direito', icon: 'north_east' },
    { key: 'center-left', label: 'Centro Esquerdo', icon: 'west' },
    { key: 'center', label: 'Centro', icon: 'filter_center_focus' },
    { key: 'center-right', label: 'Centro Direito', icon: 'east' },
    { key: 'bottom-left', label: 'Inferior Esquerdo', icon: 'south_west' },
    { key: 'bottom-center', label: 'Inferior Centro', icon: 'south' },
    { key: 'bottom-right', label: 'Inferior Direito', icon: 'south_east' },
  ];

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
      <div className="flex flex-col w-full text-on-surface select-none pb-8">
        {/* ================= BARRA SUPERIOR DE CONTROLE DO STUDIO ================= */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-space-md p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-high/80 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('varredura')}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer border border-outline/10"
              title="Voltar para Varredura"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-title-md text-title-md font-bold text-on-surface line-clamp-1 max-w-md">
                  {studioProjectTitle}
                </span>
                <Badge variant={aspectRatio === '9:16' ? 'short' : 'long'}>
                  {aspectRatio === '9:16' ? '9:16 Shorts' : '16:9 Widescreen'}
                </Badge>
                {videoQueue.length > 1 && (
                  <Badge variant="neutral">
                    Fila: {activeQueueIndex + 1} de {videoQueue.length}
                  </Badge>
                )}
              </div>
              <span className="text-label-sm font-label-sm text-outline">
                Canvas 1080p • FFmpeg Hardware Acceleration Ativo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {/* Alternador de Aspecto entre 9:16 e 16:9 */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container border border-surface-container-highest">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer',
                  aspectRatio === '9:16'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
                title="Formato Vertical 9:16 (Shorts/Reels/TikTok)"
              >
                <span className="material-symbols-outlined text-[16px]">stay_current_portrait</span>
                <span>9:16</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('16:9')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label-md font-label-md transition-all cursor-pointer',
                  aspectRatio === '16:9'
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
                title="Formato Horizontal 16:9 (YouTube Widescreen)"
              >
                <span className="material-symbols-outlined text-[16px]">stay_current_landscape</span>
                <span>16:9</span>
              </button>
            </div>

            {/* Botões de Ação do Studio */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="md"
                disabled={!currentVideo || isPreparingPreview || isGenerating}
                onClick={handleResetStudio}
                title="Restaurar configurações para o padrão de fábrica"
                leftIcon={
                  <span className="material-symbols-outlined text-[18px]">
                    restart_alt
                  </span>
                }
                className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer"
              >
                <span>Resetar</span>
              </Button>

              <Button
                variant="ghost"
                size="md"
                disabled={!currentVideo || isPreparingPreview || isGenerating}
                onClick={() => setIsDeleteStudioModalOpen(true)}
                title="Remover vídeo e excluir arquivo temporário do Studio"
                leftIcon={
                  <span className="material-symbols-outlined text-[18px]">
                    delete_outline
                  </span>
                }
                className="text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <span>Excluir do Studio</span>
              </Button>

              {/* Botão de Ação Primária: "Gerar Vídeo" */}
              <Button
                variant="primary"
                size="md"
                isLoading={isGenerating}
                disabled={!currentVideo || isPreparingPreview || isGenerating}
                onClick={handleGenerateVideo}
                leftIcon={
                  <span className="material-symbols-outlined text-[20px]">
                    movie_edit
                  </span>
                }
                className="px-5 font-bold shadow-[0_0_15px_rgba(212,163,70,0.3)] cursor-pointer"
              >
                <span>
                  {isGenerating
                    ? `Gerando (${renderProgress}%)...`
                    : 'Gerar Vídeo'}
                </span>
              </Button>
            </div>
          </div>
        </header>

        {/* ================= FILA DE ESPERA DE VÍDEOS SELECIONADOS NA VARREDURA ================= */}
        {videoQueue.length > 1 && (
          <Card className="mb-space-md p-3.5 bg-surface-container-low border border-surface-container-high/90 shadow-md">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  queue_play_next
                </span>
                <span className="font-title-sm text-title-sm font-bold text-on-surface">
                  Lista de Espera do Studio ({completedVideoIds.length}/{videoQueue.length} concluídos)
                </span>
              </div>
              <span className="text-label-sm text-on-surface-variant">
                Selecione um vídeo da lista ou gere o atual para avançar automaticamente
              </span>
            </div>

            <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
              {videoQueue.map((item, idx) => {
                const isCurrent = idx === activeQueueIndex;
                const isDone = completedVideoIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isGenerating || isPreparingPreview}
                    onClick={() => setActiveQueueIndex(idx)}
                    className={cn(
                      'flex items-center gap-2.5 p-2 rounded-xl border text-left min-w-[240px] max-w-[290px] transition-all shrink-0 cursor-pointer',
                      isCurrent
                        ? 'bg-primary/15 border-primary text-on-surface shadow-sm'
                        : isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-on-surface-variant'
                          : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-12 h-8 rounded-lg object-cover shrink-0 bg-black"
                      />
                    ) : (
                      <div className="w-12 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          movie
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-label-sm font-bold truncate">
                        {idx + 1}. {item.title}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider">
                        {isDone ? (
                          <span className="text-emerald-400">Concluído e Baixado</span>
                        ) : isCurrent ? (
                          <span className="text-primary">Em edição agora</span>
                        ) : (
                          <span className="text-outline">Aguardando na lista</span>
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* ================= ÁREA DE TRABALHO: PREVIEW + PAINEL LATERAL ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          {/* ================= COLUNA CENTRAL: VISUALIZADOR E CANVAS DE PREVIEW ================= */}
          <div className="lg:col-span-8 flex flex-col gap-space-md">
            <Card className="relative overflow-hidden bg-surface-container-lowest border border-surface-container-high/90 p-4 flex flex-col items-center justify-center min-h-[460px] shadow-2xl">
              {/* Halos Luminosos Sutis no Player */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

              {/* Moldura do Vídeo com Aspect Ratio Dinâmico (Sem imagem mockada) */}
              <div
                onClick={previewStreamUrl && !isPreparingPreview ? handleTogglePlay : undefined}
                className={cn(
                  'relative overflow-hidden rounded-2xl bg-black border border-surface-container-highest transition-all duration-300 shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-center',
                  previewStreamUrl && !isPreparingPreview ? 'cursor-pointer' : '',
                  aspectRatio === '9:16'
                    ? 'w-[290px] h-[515px] sm:w-[320px] sm:h-[568px]'
                    : 'w-full max-w-[620px] aspect-video'
                )}
              >
                {!currentVideo ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 gap-3 z-30">
                    <span className="material-symbols-outlined text-[42px] text-primary/70">
                      video_library
                    </span>
                    <p className="font-title-sm text-title-sm font-bold text-on-surface">
                      Nenhum vídeo selecionado
                    </p>
                    <p className="text-body-sm text-on-surface-variant max-w-xs">
                      Selecione um ou mais vídeos na tela de Varredura para carregá-los e editá-los em tempo real no Studio.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('varredura')}
                      leftIcon={
                        <span className="material-symbols-outlined text-[16px]">
                          travel_explore
                        </span>
                      }
                    >
                      Ir para Varredura
                    </Button>
                  </div>
                ) : isPreparingPreview ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 gap-3 z-30">
                    <span className="material-symbols-outlined text-[40px] text-primary animate-spin">
                      progress_activity
                    </span>
                    <p className="font-title-sm text-title-sm font-bold text-on-surface">
                      Baixando vídeo para visualização em tempo real...
                    </p>
                    <p className="text-label-sm text-on-surface-variant max-w-xs line-clamp-2">
                      {currentVideo.title}
                    </p>
                  </div>
                ) : previewError ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 gap-3 z-30">
                    <span className="material-symbols-outlined text-[40px] text-error">
                      error
                    </span>
                    <p className="font-title-sm text-title-sm font-bold text-on-surface">
                      Falha ao carregar o vídeo
                    </p>
                    <p className="text-label-sm text-on-surface-variant max-w-xs">
                      {previewError}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => loadVideoPreview(currentVideo)}
                      leftIcon={
                        <span className="material-symbols-outlined text-[16px]">
                          refresh
                        </span>
                      }
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                ) : previewStreamUrl ? (
                  <video
                    ref={videoRef}
                    src={previewStreamUrl}
                    playsInline
                    preload="auto"
                    muted={isMuted}
                    onLoadedMetadata={(e) => {
                      const vid = e.currentTarget;
                      if (Number.isFinite(vid.duration) && vid.duration > 0) {
                        const dur = Number(vid.duration.toFixed(2));
                        setTotalDuration((prev) => (prev <= 0 ? dur : prev));
                        setTrimOut((prev) => (prev <= 0 ? dur : prev));
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => {
                      const vid = e.currentTarget;
                      const now = vid.currentTime;
                      setCurrentTime(now);
                      if (trimOut > trimIn && now >= trimOut) {
                        vid.pause();
                        vid.currentTime = trimIn;
                        setIsPlaying(false);
                        setCurrentTime(trimIn);
                      }
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      seekVideoTo(trimIn);
                    }}
                    onError={(e) => {
                      const err = e.currentTarget.error;
                      console.error('Erro no elemento de vídeo:', err?.code, err?.message);
                      toast.error('Erro ao decodificar stream do vídeo no navegador.');
                    }}
                    className="w-full h-full object-contain select-none"
                  />
                ) : null}

                {/* Camada de Canvas Sobreposta ao Vídeo (visível apenas quando o vídeo real está carregado) */}
                <canvas
                  ref={canvasRef}
                  width={aspectRatio === '9:16' ? 360 : 640}
                  height={aspectRatio === '9:16' ? 640 : 360}
                  className={cn(
                    'absolute inset-0 w-full h-full object-contain pointer-events-none z-20',
                    (!previewStreamUrl || isPreparingPreview || Boolean(previewError)) &&
                      'hidden'
                  )}
                />

                {/* Indicador de Margens Seguras (Safe Zone) */}
                <div className="absolute inset-4 border border-dashed border-primary/20 rounded-xl pointer-events-none z-10 flex items-start justify-end p-1">
                  <span className="text-[9px] font-bold tracking-wider uppercase text-primary/40 bg-black/40 px-1 rounded">
                    Safe Zone
                  </span>
                </div>

                {/* Botão Central de Play no Hover (quando pausado e vídeo pronto) */}
                {!isPlaying && Boolean(previewStreamUrl) && !isPreparingPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePlay();
                    }}
                    className="absolute z-30 w-16 h-16 rounded-full bg-primary/90 text-on-primary flex items-center justify-center shadow-[0_0_24px_rgba(242,190,94,0.4)] transition-transform hover:scale-110 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[36px] ml-1">
                      play_arrow
                    </span>
                  </button>
                )}
              </div>

              {/* Barra de Controles do Player com Cronômetro Tabular */}
              <div className="w-full max-w-xl mt-4 flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-surface-container/80 backdrop-blur-md border border-surface-container-high/80">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!previewStreamUrl || isPreparingPreview}
                    onClick={handleTogglePlay}
                    className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer shadow-sm disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={!previewStreamUrl || isPreparingPreview}
                    onClick={() => seekVideoTo(Math.max(trimIn, currentTime - 5))}
                    title="Retroceder 5 segundos"
                    className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">replay_5</span>
                  </button>

                  <button
                    type="button"
                    disabled={!previewStreamUrl || isPreparingPreview}
                    onClick={() => seekVideoTo(Math.min(trimOut, currentTime + 5))}
                    title="Avançar 5 segundos"
                    className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">forward_5</span>
                  </button>

                  <button
                    type="button"
                    disabled={!previewStreamUrl || isPreparingPreview}
                    onClick={() => {
                      const next = !isMuted;
                      setIsMuted(next);
                      if (videoRef.current) {
                        videoRef.current.muted = next;
                      }
                    }}
                    title={isMuted ? 'Ativar som' : 'Silenciar áudio'}
                    className="w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isMuted ? 'volume_off' : 'volume_up'}
                    </span>
                  </button>
                </div>

                {/* Cronômetro com Números Tabulares Precisos */}
                <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-outline/10">
                  <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <span className="font-mono text-title-sm text-title-sm font-bold text-on-surface tabular-nums">
                    {formatTime(currentTime)} / {formatTime(totalDuration)}
                  </span>
                  <span className="text-[10px] text-outline px-1 py-0.5 rounded bg-surface-container font-mono">
                    Corte: {formatTime(Math.max(0, trimOut - trimIn))}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={!previewStreamUrl || isPreparingPreview}
                    onClick={() => seekVideoTo(trimIn)}
                    title="Ir para Marcador In"
                    className="px-2 py-1 text-label-sm font-label-sm rounded-md bg-surface-container hover:bg-surface-container-high text-primary font-bold cursor-pointer disabled:opacity-40"
                  >
                    Ir ao In
                  </button>
                  <button
                    type="button"
                    disabled={!previewStreamUrl || isPreparingPreview}
                    onClick={() => seekVideoTo(trimOut)}
                    title="Ir para Marcador Out"
                    className="px-2 py-1 text-label-sm font-label-sm rounded-md bg-surface-container hover:bg-surface-container-high text-primary font-bold cursor-pointer disabled:opacity-40"
                  >
                    Ir ao Out
                  </button>
                </div>
              </div>
            </Card>

            {/* ================= TIMELINE DE PRECISÃO (INFERIOR) ================= */}
            <Card className="bg-surface-container-low border border-surface-container-high/90 p-4 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    graphic_eq
                  </span>
                  <span className="font-title-sm text-title-sm font-bold text-on-surface">
                    Timeline de Precisão (Audio Waveform & Trim)
                  </span>
                </div>

                {/* Tooltips dos Marcadores de Corte */}
                <div className="flex items-center gap-3 font-mono text-label-sm font-label-sm tabular-nums">
                  <span className="text-on-surface-variant">
                    In: <strong className="text-primary">{formatTime(trimIn, true)}</strong>
                  </span>
                  <span className="text-outline">•</span>
                  <span className="text-on-surface-variant">
                    Out: <strong className="text-primary">{formatTime(trimOut, true)}</strong>
                  </span>
                  <span className="text-outline">•</span>
                  <span className="text-tertiary">
                    Duração: <strong>{Math.max(0, trimOut - trimIn).toFixed(2)}s</strong>
                  </span>
                </div>
              </div>

              {/* Contêiner Interativo da Timeline */}
              <div className="relative flex flex-col select-none pt-4 pb-2">
                {/* Régua de Tempo Dinâmica conforme a duração real do vídeo */}
                <div className="w-full flex justify-between text-[10px] text-outline font-mono mb-1.5 px-1">
                  {[0, 0.166, 0.333, 0.5, 0.666, 0.833, 1].map((ratio, idx) => (
                    <span key={idx}>{formatTime(totalDuration * ratio)}</span>
                  ))}
                </div>

                {/* Pista da Onda Sonora Real do Vídeo e Região de Corte */}
                <div
                  ref={timelineRef}
                  onClick={totalDuration > 0 ? handleTimelineClick : undefined}
                  className={cn(
                    'relative w-full h-20 rounded-xl bg-surface-container-lowest border border-surface-container-highest/80 overflow-hidden flex items-center px-1',
                    totalDuration > 0 ? 'cursor-pointer' : 'cursor-default'
                  )}
                >
                  {waveformPeaks.length === 0 || totalDuration <= 0 ? (
                    <div className="w-full h-full flex items-center justify-center gap-2 text-label-sm text-on-surface-variant">
                      {isPreparingPreview ? (
                        <>
                          <span className="material-symbols-outlined text-[18px] text-primary animate-spin">
                            progress_activity
                          </span>
                          <span>Extraindo onda sonora real (Audio Waveform) do vídeo...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[18px] text-outline">
                            graphic_eq
                          </span>
                          <span>
                            {previewError
                              ? 'Não foi possível extrair o áudio do vídeo.'
                              : 'Aguardando carregamento do vídeo para exibir a onda sonora real.'}
                          </span>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Gráfico da Onda Sonora Real extraída via FFmpeg */}
                      <div className="w-full h-full flex items-center justify-between gap-[2px] px-1 pointer-events-none">
                        {waveformPeaks.map((peak, idx) => {
                          const peakTime = (idx / waveformPeaks.length) * totalDuration;
                          const isInsideCut = peakTime >= trimIn && peakTime <= trimOut;

                          return (
                            <div
                              key={idx}
                              className={cn(
                                'flex-1 rounded-full transition-colors',
                                isInsideCut
                                  ? 'bg-primary shadow-[0_0_6px_rgba(242,190,94,0.3)]'
                                  : 'bg-surface-container-highest/60 opacity-30'
                              )}
                              style={{
                                height: `${peak * 85}%`,
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Faixa Sombreada Excluída (Antes do In) */}
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none border-r border-primary/40"
                        style={{ width: `${(trimIn / totalDuration) * 100}%` }}
                      />

                      {/* Faixa Sombreada Excluída (Depois do Out) */}
                      <div
                        className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none border-l border-primary/40"
                        style={{ width: `${100 - (trimOut / totalDuration) * 100}%` }}
                      />

                      {/* Faixa Ativa com Destaque Âmbar (#D4A346) */}
                      <div
                        className="absolute top-0 bottom-0 pointer-events-none border-y-2 border-primary bg-primary/10"
                        style={{
                          left: `${(trimIn / totalDuration) * 100}%`,
                          width: `${((trimOut - trimIn) / totalDuration) * 100}%`,
                        }}
                      />

                      {/* Marcador Início (In) - Arrastável */}
                      <div
                        onMouseDown={(e) => handleTimelineMouseDown(e, 'in')}
                        className="absolute top-0 bottom-0 z-30 flex flex-col items-center cursor-ew-resize group"
                        style={{ left: `${(trimIn / totalDuration) * 100}%` }}
                      >
                        <div className="w-4 h-full bg-primary/30 flex items-center justify-center relative -translate-x-1/2">
                          <div className="w-1.5 h-full bg-primary rounded-full shadow-[0_0_8px_rgba(212,163,70,0.8)]" />
                          {/* Handle Superior com Tooltip */}
                          <div className="absolute -top-3 w-5 h-5 rounded-md bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shadow-md">
                            In
                          </div>
                        </div>
                      </div>

                      {/* Marcador Fim (Out) - Arrastável */}
                      <div
                        onMouseDown={(e) => handleTimelineMouseDown(e, 'out')}
                        className="absolute top-0 bottom-0 z-30 flex flex-col items-center cursor-ew-resize group"
                        style={{ left: `${(trimOut / totalDuration) * 100}%` }}
                      >
                        <div className="w-4 h-full bg-primary/30 flex items-center justify-center relative -translate-x-1/2">
                          <div className="w-1.5 h-full bg-primary rounded-full shadow-[0_0_8px_rgba(212,163,70,0.8)]" />
                          {/* Handle Superior com Tooltip */}
                          <div className="absolute -top-3 w-5 h-5 rounded-md bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold shadow-md">
                            Out
                          </div>
                        </div>
                      </div>

                      {/* Agulha de Reprodução (Playhead) */}
                      <div
                        onMouseDown={(e) => handleTimelineMouseDown(e, 'playhead')}
                        className="absolute top-0 bottom-0 z-40 flex flex-col items-center cursor-ew-resize"
                        style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                      >
                        <div className="w-0.5 h-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)] relative -translate-x-1/2">
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 rounded-xs" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Botões de Micro-ajuste de 0.1s */}
                <div className="flex items-center justify-between mt-2 text-label-sm font-label-sm text-outline">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTrimIn((v) => Math.max(0, v - 0.1))}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                    >
                      In -0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimIn((v) => Math.min(trimOut - 0.5, v + 0.1))}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                    >
                      In +0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimIn(currentTime)}
                      className="px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold hover:bg-primary/30 cursor-pointer"
                    >
                      Definir In Aqui
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTrimOut(currentTime)}
                      className="px-2 py-0.5 rounded bg-primary/20 text-primary font-semibold hover:bg-primary/30 cursor-pointer"
                    >
                      Definir Out Aqui
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimOut((v) => Math.max(trimIn + 0.5, v - 0.1))}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                    >
                      Out -0.1s
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimOut((v) => Math.min(totalDuration, v + 0.1))}
                      className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface cursor-pointer"
                    >
                      Out +0.1s
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ================= COLUNA LATERAL: CONFIGURAÇÕES (DIREITA) ================= */}
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

              {/* ================= ABA 1: CONFIGURAÇÕES DE LEGENDA ================= */}
              {activeTab === 'legendas' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  {/* Painel de Conexão da Conta Google AI Studio (BYOK Gemini) */}
                  <div
                    className={cn(
                      'p-3 rounded-xl border flex flex-col gap-2.5 transition-all',
                      isGeminiConnected
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-surface-container border-surface-container-highest'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            'material-symbols-outlined text-[20px] shrink-0',
                            isGeminiConnected ? 'text-emerald-400' : 'text-primary'
                          )}
                        >
                          {isGeminiConnected ? 'verified_user' : 'key'}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-label-md font-bold text-on-surface truncate">
                            {isGeminiConnected
                              ? 'Google AI Studio Conectado'
                              : 'Conta Google Gemini'}
                          </span>
                          <span className="text-[11px] text-on-surface-variant truncate">
                            {isGeminiConnected
                              ? 'Gerador de legendas Gemini habilitado'
                              : 'Conecte sua conta para liberar o gerador'}
                          </span>
                        </div>
                      </div>

                      {isGeminiConnected ? (
                        <button
                          type="button"
                          onClick={handleDisconnectGemini}
                          disabled={isDisconnectingGemini}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-error/15 text-error hover:bg-error/25 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isDisconnectingGemini ? 'Saindo...' : 'Desconectar'}
                        </button>
                      ) : (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setIsGeminiModalOpen(true)}
                          leftIcon={
                            <span className="material-symbols-outlined text-[16px]">login</span>
                          }
                          className="shrink-0"
                        >
                          Conectar Conta
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Alternador entre Legenda Fixa e Legenda Dinâmica Gemini */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider">
                      Modo de Legenda
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSubtitleMode('static')}
                        className={cn(
                          'flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-label-md font-label-md transition-all cursor-pointer',
                          subtitleMode === 'static'
                            ? 'bg-primary/15 border-primary text-primary font-bold shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                            : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface'
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px]">title</span>
                        <span>Legenda Fixa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isGeminiConnected) {
                            toast.info(
                              'Conecte sua conta do Google AI Studio para desbloquear o gerador de legendas pelo Gemini.'
                            );
                            setIsGeminiModalOpen(true);
                            return;
                          }
                          setSubtitleMode('dynamic');
                        }}
                        className={cn(
                          'flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-label-md font-label-md transition-all cursor-pointer',
                          subtitleMode === 'dynamic' && isGeminiConnected
                            ? 'bg-primary/15 border-primary text-primary font-bold shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                            : !isGeminiConnected
                              ? 'bg-surface-container-lowest border-surface-container-highest text-outline opacity-75 hover:border-primary/40'
                              : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface'
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isGeminiConnected ? 'auto_awesome' : 'lock'}
                        </span>
                        <span>Dinâmica (Gemini)</span>
                      </button>
                    </div>
                  </div>

                  {/* Campo de Texto Estático ou Gerador Dinâmico Gemini */}
                  {subtitleMode === 'static' ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-sm font-label-sm text-outline font-semibold">
                        Texto da Legenda Estática
                      </label>
                      <textarea
                        value={staticText}
                        onChange={(e) => setStaticText(e.target.value)}
                        rows={3}
                        placeholder="Digite o texto que será renderizado no vídeo..."
                        className="w-full bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 text-body-md text-on-surface outline-none focus:border-primary/80 transition-all resize-none"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* Card Principal de Destaque: Transcrever Áudio do Vídeo (Reconhecimento de Fala Real) */}
                      <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/40 flex flex-col gap-2.5 shadow-[0_0_15px_rgba(212,163,70,0.08)]">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-primary/15 text-primary shrink-0">
                            <span className="material-symbols-outlined text-[20px] block">
                              record_voice_over
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-label-md font-bold text-on-surface">
                              Transcrever Áudio do Vídeo
                            </span>
                            <span className="text-[11px] text-outline leading-tight">
                              Ouve a fala real do vídeo e sincroniza cada bloco com precisão
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="primary"
                          size="md"
                          disabled={
                            !isGeminiConnected ||
                            isTranscribingAudio ||
                            isGeneratingSubtitles ||
                            !currentVideo
                          }
                          isLoading={isTranscribingAudio}
                          onClick={handleTranscribeCurrentVideo}
                          leftIcon={
                            <span className="material-symbols-outlined text-[18px]">
                              {isGeminiConnected ? 'mic' : 'lock'}
                            </span>
                          }
                          className="w-full font-bold shadow-md"
                        >
                          {!isGeminiConnected
                            ? 'Conectar Gemini para Transcrever'
                            : isTranscribingAudio
                              ? 'Ouvindo e Transcrevendo Fala...'
                              : 'Transcrever Fala do Vídeo com Gemini'}
                        </Button>

                        {trimIn > 0 || (trimOut > 0 && trimOut < totalDuration) ? (
                          <span className="text-[10px] text-primary/80 flex items-center gap-1 font-medium">
                            <span className="material-symbols-outlined text-[12px]">content_cut</span>
                            Transcrevendo trecho ativo da timeline ({trimIn.toFixed(1)}s a {trimOut.toFixed(1)}s)
                          </span>
                        ) : null}

                        {!isGeminiConnected && (
                          <p className="text-[11px] text-outline text-center">
                            Conecte sua conta do Google AI Studio acima para habilitar a transcrição.
                          </p>
                        )}
                      </div>

                      {/* Opções Alternativas: Roteiro por IA ou Upload de Arquivo Próprio */}
                      <div className="rounded-xl border border-surface-container-highest bg-surface-container-lowest overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowAdvancedGeminiOptions((v) => !v)}
                          className="w-full flex items-center justify-between p-2.5 text-[12px] font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px] text-outline">tune</span>
                            <span>Outras opções: Gerar por roteiro de IA ou arquivo externo</span>
                          </span>
                          <span
                            className={cn(
                              'material-symbols-outlined text-[16px] transition-transform duration-200',
                              showAdvancedGeminiOptions && 'rotate-180'
                            )}
                          >
                            expand_more
                          </span>
                        </button>

                        {showAdvancedGeminiOptions && (
                          <div className="p-3 border-t border-surface-container-highest flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-label-sm font-label-sm text-outline font-semibold">
                                Roteiro / Contexto para o Gemini
                              </label>
                              <textarea
                                value={geminiPrompt}
                                onChange={(e) => setGeminiPrompt(e.target.value)}
                                rows={3}
                                disabled={!isGeminiConnected}
                                placeholder="Informe o tema/roteiro do vídeo caso queira que a IA invente legendas dinâmicas a partir de um texto..."
                                className="w-full bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3 text-body-md text-on-surface outline-none focus:border-primary/80 transition-all resize-none disabled:opacity-50"
                              />
                            </div>

                            {/* Upload opcional de arquivo externo */}
                            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-container border border-surface-container-highest">
                              <input
                                ref={mediaFileInputRef}
                                type="file"
                                accept="audio/*,video/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0] || null;
                                  setSelectedMediaFile(f);
                                }}
                              />
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                                  audio_file
                                </span>
                                <span className="text-body-xs text-on-surface-variant truncate">
                                  {selectedMediaFile
                                    ? selectedMediaFile.name
                                    : 'Arquivo avulso (opcional)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {selectedMediaFile && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedMediaFile(null);
                                      if (mediaFileInputRef.current) {
                                        mediaFileInputRef.current.value = '';
                                      }
                                    }}
                                    className="p-1 rounded-lg text-outline hover:text-error cursor-pointer"
                                    title="Remover arquivo"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={!isGeminiConnected}
                                  onClick={() => mediaFileInputRef.current?.click()}
                                  className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-[11px] font-semibold text-on-surface transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  Escolher Arquivo
                                </button>
                              </div>
                            </div>

                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={!isGeminiConnected || isGeneratingSubtitles || isTranscribingAudio}
                              isLoading={isGeneratingSubtitles}
                              onClick={handleGenerateGeminiSubtitles}
                              leftIcon={
                                <span className="material-symbols-outlined text-[16px]">
                                  auto_awesome
                                </span>
                              }
                              className="w-full font-bold"
                            >
                              Gerar Legendas por Roteiro / Arquivo
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lista Real de Segmentos Gerados pelo Gemini */}
                  {dynamicSegments.length > 0 && (
                    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest max-h-40 overflow-y-auto">
                      <div className="flex items-center justify-between text-[11px] text-outline font-semibold mb-1">
                        <span>Legendas Sincronizadas ({dynamicSegments.length})</span>
                        <span>Clique para pré-visualizar</span>
                      </div>
                      {dynamicSegments.map((seg, idx) => {
                        const isActive = currentTime >= seg.start && currentTime <= seg.end;
                        return (
                          <button
                            key={`${seg.start}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSubtitleMode('dynamic');
                              setCurrentTime(seg.start);
                            }}
                            className={cn(
                              'flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-body-xs transition-colors cursor-pointer',
                              isActive
                                ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                                : 'hover:bg-surface-container text-on-surface'
                            )}
                          >
                            <span className="truncate">{seg.text}</span>
                            <span className="font-mono text-[10px] text-outline shrink-0">
                              {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Seleção Tipográfica */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-label-sm text-outline font-semibold">
                      Família Tipográfica
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                      className="w-full bg-surface-container-lowest border border-surface-container-highest rounded-xl px-3 py-2.5 text-body-md text-on-surface outline-none focus:border-primary/80 transition-all cursor-pointer"
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Padrão)</option>
                      <option value="Montserrat">Montserrat (Impactante)</option>
                      <option value="Bebas Neue">Bebas Neue (Condensada)</option>
                      <option value="Anton">Anton (Bold Pesado)</option>
                    </select>
                  </div>

                  {/* Seletores Nativos de Cor Hexadecimal */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-label-sm text-outline font-semibold">
                        Cor do Texto
                      </label>
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-lowest border border-surface-container-highest">
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-full bg-transparent text-[11px] font-mono outline-none text-on-surface uppercase"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-label-sm text-outline font-semibold">
                        Contorno
                      </label>
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-lowest border border-surface-container-highest">
                        <input
                          type="color"
                          value={strokeColor}
                          onChange={(e) => setStrokeColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={strokeColor}
                          onChange={(e) => setStrokeColor(e.target.value)}
                          className="w-full bg-transparent text-[11px] font-mono outline-none text-on-surface uppercase"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-label-sm text-outline font-semibold">
                        Cor do Fundo
                      </label>
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-lowest border border-surface-container-highest">
                        <input
                          type="color"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-full bg-transparent text-[11px] font-mono outline-none text-on-surface uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Slider de Tamanho da Fonte com Trilho Âmbar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span className="text-outline font-semibold">Tamanho da Fonte</span>
                      <span className="text-primary font-bold font-mono">{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={48}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-surface-container-highest rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Toggle Caixa de Fundo vs Contorno */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container border border-surface-container-highest">
                    <span className="text-body-sm font-body-sm text-on-surface">
                      Caixa de fundo arredondada
                    </span>
                    <input
                      type="checkbox"
                      checked={useBackgroundBox}
                      onChange={(e) => setUseBackgroundBox(e.target.checked)}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </div>

                  {/* Selo fix_bounds */}
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-2 text-label-sm font-label-sm text-primary">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Cálculo determinístico fix_bounds ativado (sem estouro de bordas)</span>
                  </div>
                </div>
              )}

              {/* ================= ABA 2: CONFIGURAÇÕES DE MARCA D'ÁGUA ================= */}
              {activeTab === 'marca-dagua' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-200">
                  {/* Seletor de Logos Cadastrados na Conta */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider">
                        Logo Cadastrado
                      </label>
                      <button
                        type="button"
                        onClick={() => navigate('marcas-dagua')}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">tune</span>
                        Gerenciar
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Opção: Sem Marca d'Água */}
                      <div
                        onClick={() => setSelectedWatermarkId('none')}
                        className={cn(
                          'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
                          selectedWatermarkId === 'none'
                            ? 'bg-primary/15 border-primary shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                            : 'bg-surface-container border-surface-container-highest hover:bg-surface-container-high'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center p-1 border border-outline/10 text-on-surface-variant">
                            <span className="material-symbols-outlined text-[18px]">block</span>
                          </div>
                          <span className="text-title-sm font-semibold text-on-surface">
                            Sem Marca d'Água
                          </span>
                        </div>
                        {selectedWatermarkId === 'none' && (
                          <span className="material-symbols-outlined text-[18px] text-primary">
                            check_circle
                          </span>
                        )}
                      </div>

                      {/* Lista Real de Marcas do Usuário */}
                      {isLoadingWatermarks && (
                        <div className="p-3 text-center text-body-sm text-outline">
                          Carregando marcas d'água...
                        </div>
                      )}

                      {!isLoadingWatermarks && userWatermarks.length === 0 && (
                        <div className="p-3 rounded-xl bg-surface-container-lowest border border-dashed border-outline/30 text-center flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-[24px] text-outline">
                            branding_watermark
                          </span>
                          <p className="text-body-xs text-outline">
                            Nenhuma marca d'água salva na sua conta.
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => navigate('marcas')}
                            leftIcon={
                              <span className="material-symbols-outlined text-[16px]">add</span>
                            }
                          >
                            Nova Marca
                          </Button>
                        </div>
                      )}

                      {userWatermarks.map((logo) => (
                        <div
                          key={logo.id}
                          onClick={() => setSelectedWatermarkId(logo.id)}
                          className={cn(
                            'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
                            selectedWatermarkId === logo.id
                              ? 'bg-primary/15 border-primary shadow-[0_0_10px_rgba(212,163,70,0.15)]'
                              : 'bg-surface-container border-surface-container-highest hover:bg-surface-container-high'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[repeating-conic-gradient(#202020_0%_25%,#303030_0%_50%)] bg-[length:8px_8px] flex items-center justify-center p-0.5 border border-outline/10 overflow-hidden shrink-0">
                              <img
                                src={logo.url || `${API_BASE_URL}/watermarks/${logo.id}/file`}
                                alt={logo.original_name}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <span className="text-title-sm font-semibold text-on-surface truncate">
                              {logo.original_name}
                            </span>
                          </div>
                          {selectedWatermarkId === logo.id && (
                            <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
                              check_circle
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Matriz 3x3 de Posicionamento na Tela */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-label-sm font-label-sm text-outline font-semibold uppercase tracking-wider">
                        Posição na Tela (Matriz 3x3)
                      </label>
                      <span className="text-[10px] font-mono text-primary uppercase">
                        {watermarkPosition}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-surface-container-lowest border border-surface-container-highest">
                      {MATRIX_POSITIONS.map((pos) => {
                        const isSelected = watermarkPosition === pos.key;
                        return (
                          <button
                            key={pos.key}
                            type="button"
                            onClick={() => setWatermarkPosition(pos.key)}
                            title={pos.label}
                            className={cn(
                              'h-12 rounded-xl flex items-center justify-center transition-all cursor-pointer border',
                              isSelected
                                ? 'bg-primary text-on-primary border-primary shadow-[0_0_12px_rgba(242,190,94,0.4)] font-bold scale-105'
                                : 'bg-surface-container border-surface-container-highest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                            )}
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {pos.icon}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slider de Opacidade (0% a 100%) */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span className="text-outline font-semibold">Opacidade da Marca</span>
                      <span className="text-primary font-bold font-mono">{watermarkOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-surface-container-highest rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Slider de Escala da Marca */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-label-sm font-label-sm">
                      <span className="text-outline font-semibold">Tamanho / Escala</span>
                      <span className="text-primary font-bold font-mono">{watermarkScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      value={watermarkScale}
                      onChange={(e) => setWatermarkScale(Number(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-surface-container-highest rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* ================= MODAL DE VINCULAÇÃO DE CONTA GOOGLE AI STUDIO (BYOK) ================= */}
      {isGeminiModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => !isConnectingGemini && setIsGeminiModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface-container-low border border-surface-container-highest p-6 shadow-2xl flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="font-title-lg text-title-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-primary">
                    auto_awesome
                  </span>
                  <span>Conectar Conta Google (Gemini)</span>
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Vincule sua chave pessoal do Google AI Studio para desbloquear o gerador de legendas dinâmicas com o Gemini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isConnectingGemini && setIsGeminiModalOpen(false)}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="Fechar"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleConnectGemini} className="flex flex-col gap-4">
              <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-surface-container-highest flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-label-md font-bold text-on-surface">
                    1. Entre na sua conta Google AI Studio
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-label-sm font-bold transition-colors"
                  >
                    <span>Abrir Google AI Studio</span>
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </a>
                </div>
                <p className="text-body-xs text-on-surface-variant leading-relaxed">
                  Faça login com sua conta Google no portal oficial do Google AI Studio, clique em{' '}
                  <strong className="text-on-surface">"Create API Key"</strong> e copie a chave gerada.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label-md font-bold text-on-surface">
                  2. Cole sua chave de API do Gemini
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={geminiApiKeyInput}
                    onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    autoComplete="off"
                    className="w-full bg-surface-container-lowest border border-surface-container-highest rounded-xl pl-3.5 pr-10 py-2.5 text-body-md font-mono text-on-surface outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((v) => !v)}
                    className="absolute right-2.5 text-outline hover:text-on-surface cursor-pointer p-1"
                    title={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showApiKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <span className="text-[11px] text-outline flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px] text-primary">lock</span>
                  Sua chave é validada em tempo real e armazenada com criptografia AES-256-GCM no servidor.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsGeminiModalOpen(false)}
                  disabled={isConnectingGemini}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isConnectingGemini}
                  leftIcon={
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  }
                >
                  Vincular e Habilitar Gemini
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão do Studio */}
      <ConfirmModal
        isOpen={isDeleteStudioModalOpen && Boolean(currentVideo)}
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
        title="Excluir do Studio"
        icon="delete_forever"
        message="Tem certeza de que deseja remover este vídeo do Studio?"
        itemTitle={currentVideo?.title || 'Vídeo Selecionado'}
        itemSubtitle={currentVideo?.url}
        warningText="O arquivo de vídeo temporário baixado no servidor e suas configurações de corte/legendas salvas serão excluídos."
        confirmText="Confirmar Exclusão"
        isLoading={isDeletingFromStudio}
        variant="danger"
      />
    </AppShell>
  );
};
