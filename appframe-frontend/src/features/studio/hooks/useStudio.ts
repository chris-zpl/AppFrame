import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mediaService, type StudioVideoQueueItem } from '../../history';
import type { FontFamily, SubtitleMode } from '../types';
import { useStudioQueue } from './useStudioQueue';
import { useStudioWatermark } from './useStudioWatermark';
import { useStudioPlayer } from './useStudioPlayer';
import { useStudioSubtitles } from './useStudioSubtitles';
import { useStudioCanvas } from './useStudioCanvas';
import { useStudioRender } from './useStudioRender';
import { useStudioPersistence } from './useStudioPersistence';
import { getSavedStudioState } from '../utils';
import { DEFAULT_SUBTITLE_COLORS } from '../constants';
import { toast } from 'sonner';

const VALID_STUDIO_TABS: Record<string, 'legendas' | 'marca-dagua'> = {
  legendas: 'legendas',
  legenda: 'legendas',
  subtitles: 'legendas',
  subtitle: 'legendas',
  'marca-dagua': 'marca-dagua',
  marcadagua: 'marca-dagua',
  watermark: 'marca-dagua',
  watermarks: 'marca-dagua',
};

function resolveStudioTab(searchParams: URLSearchParams): 'legendas' | 'marca-dagua' {
  const raw = (
    searchParams.get('tab') ||
    searchParams.get('sidebar') ||
    ''
  ).toLowerCase();
  return VALID_STUDIO_TABS[raw] || 'legendas';
}

export interface UseStudioProps {
  navigate: (path: string, params?: Record<string, string>) => void;
  params: {
    videoUrl?: string;
    sourceUrl?: string;
    selectedVideos?: string;
    videoTitle?: string;
  };
}

export const useStudio = ({ navigate, params }: UseStudioProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Consulta real do status de vinculação da conta Google AI Studio (Gemini)
  const { data: geminiStatus, isLoading: isLoadingGeminiStatus } = useQuery({
    queryKey: ['gemini-status'],
    queryFn: mediaService.getGeminiStatus,
  });

  const isGeminiConnected = Boolean(geminiStatus?.connected);

  // 1. Gerenciamento de Fila de Vídeos
  const queue = useStudioQueue(params);

  // Lê imediatamente o estado salvo do vídeo atual (se houver) para evitar resets de tamanho ou posição
  const initialSaved = getSavedStudioState(queue.currentVideo);

  // 2. Gerenciamento de Marca d'Água
  const watermark = useStudioWatermark({ currentVideo: queue.currentVideo });

  // 3. Estados de Customização de Legenda e Painel
  const [activeTab, setActiveTabState] = useState<'legendas' | 'marca-dagua'>(() => resolveStudioTab(searchParams));

  const setActiveTab = useCallback(
    (nextTab: 'legendas' | 'marca-dagua') => {
      setActiveTabState(nextTab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextTab === 'legendas') {
            next.delete('tab');
            next.delete('sidebar');
          } else {
            next.set('tab', nextTab);
            next.delete('sidebar');
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Sincroniza activeTab se a URL mudar (ex: botão voltar/avançar do navegador)
  useEffect(() => {
    const nextTab = resolveStudioTab(searchParams);
    if (nextTab !== activeTab) {
      setActiveTabState(nextTab);
    }
  }, [searchParams]);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>(
    () => initialSaved?.subtitleMode || 'static'
  );
  const [staticText, setStaticText] = useState<string>(
    () => (initialSaved?.staticText !== undefined ? initialSaved.staticText : (queue.currentVideo?.title || params.videoTitle || ''))
  );
  const [geminiPrompt, setGeminiPrompt] = useState<string>(
    () => (initialSaved?.geminiPrompt !== undefined ? initialSaved.geminiPrompt : (queue.currentVideo?.title || params.videoTitle || ''))
  );
  const [fontFamily, setFontFamily] = useState<FontFamily>(
    () => initialSaved?.fontFamily || 'Plus Jakarta Sans'
  );
  const [textColor, setTextColor] = useState<string>(
    () => initialSaved?.textColor || DEFAULT_SUBTITLE_COLORS.textColor
  );
  const [bgColor, setBgColor] = useState<string>(
    () => initialSaved?.bgColor || DEFAULT_SUBTITLE_COLORS.bgColor
  );
  const [strokeColor, setStrokeColor] = useState<string>(
    () => initialSaved?.strokeColor || DEFAULT_SUBTITLE_COLORS.strokeColor
  );
  const [fontSize, setFontSize] = useState<number>(
    () => (typeof initialSaved?.fontSize === 'number' ? initialSaved.fontSize : 28)
  );
  const [useBackgroundBox, setUseBackgroundBox] = useState<boolean>(
    () => (typeof initialSaved?.useBackgroundBox === 'boolean' ? initialSaved.useBackgroundBox : true)
  );

  const handleResetColors = useCallback(() => {
    setTextColor(DEFAULT_SUBTITLE_COLORS.textColor);
    setStrokeColor(DEFAULT_SUBTITLE_COLORS.strokeColor);
    setBgColor(DEFAULT_SUBTITLE_COLORS.bgColor);
    toast.success('Cores da legenda restauradas para o padrão.');
  }, []);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);

  // Bloqueia modo dinâmico caso Gemini não esteja conectado
  useEffect(() => {
    if (!isLoadingGeminiStatus && !isGeminiConnected && subtitleMode === 'dynamic') {
      queueMicrotask(() => {
        setSubtitleMode('static');
      });
    }
  }, [isLoadingGeminiStatus, isGeminiConnected, subtitleMode]);

  const watermarkRef = useRef(watermark);
  useEffect(() => {
    watermarkRef.current = watermark;
  }, [watermark]);

  // Callback para restaurar estado salvo do localStorage
  const handleRestoreSavedState = useCallback(
    (saved: any, videoItem: StudioVideoQueueItem) => {
      if (saved?.staticText !== undefined) setStaticText(saved.staticText);
      else setStaticText(videoItem.title || '');

      if (saved?.geminiPrompt !== undefined) setGeminiPrompt(saved.geminiPrompt);
      else setGeminiPrompt(videoItem.title || '');

      if (saved?.subtitleMode) setSubtitleMode(saved.subtitleMode);
      if (saved?.fontFamily) setFontFamily(saved.fontFamily);
      if (saved?.textColor) setTextColor(saved.textColor);
      if (saved?.bgColor) setBgColor(saved.bgColor);
      if (saved?.strokeColor) setStrokeColor(saved.strokeColor);
      if (typeof saved?.fontSize === 'number') setFontSize(saved.fontSize);
      if (typeof saved?.useBackgroundBox === 'boolean') setUseBackgroundBox(saved.useBackgroundBox);

      const wm = watermarkRef.current;
      if (saved?.selectedWatermarkId !== undefined) {
        wm.setSelectedWatermarkId(saved.selectedWatermarkId);
      } else if (wm.userWatermarks.length > 0) {
        wm.setSelectedWatermarkId(wm.userWatermarks[0].id);
      } else {
        wm.setSelectedWatermarkId('none');
      }
      wm.markWatermarkAsSelected();

      if (saved?.watermarkPosition) wm.setWatermarkPosition(saved.watermarkPosition);
      if (typeof saved?.watermarkOpacity === 'number') wm.setWatermarkOpacity(saved.watermarkOpacity);
      if (typeof saved?.watermarkScale === 'number') wm.setWatermarkScale(saved.watermarkScale);
    },
    []
  );

  // 4. Gerenciamento do Player e Timeline
  const player = useStudioPlayer({
    currentVideo: queue.currentVideo,
    onRestoreSavedState: handleRestoreSavedState,
  });

  // 5. Hook de Legendas e Transcrição Gemini
  const subtitles = useStudioSubtitles({
    isGeminiConnected,
    currentVideoUrl: queue.currentVideo?.url || params.videoUrl || params.sourceUrl,
    currentPreviewId: player.currentPreviewId,
    trimIn: player.trimIn,
    trimOut: player.trimOut,
    totalDuration: player.totalDuration,
    setSubtitleMode,
    setCurrentTime: player.setCurrentTime,
  });

  // 6. Gerenciamento do Canvas
  const canvas = useStudioCanvas({
    aspectRatio: player.aspectRatio,
    subtitleMode,
    staticText,
    dynamicSegments: subtitles.dynamicSegments,
    fontFamily,
    fontSize,
    textColor,
    bgColor,
    strokeColor,
    useBackgroundBox,
    selectedLogo: watermark.selectedLogo,
    watermarkPosition: watermark.watermarkPosition,
    watermarkOpacity: watermark.watermarkOpacity,
    watermarkScale: watermark.watermarkScale,
    currentTime: player.currentTime,
    previewStreamUrl: player.previewStreamUrl,
    isPreparingPreview: player.isPreparingPreview,
    previewError: player.previewError,
  });

  // 7. Persistência no LocalStorage e Factory Reset
  const persistence = useStudioPersistence({
    currentVideo: queue.currentVideo,
    isPreparingPreview: player.isPreparingPreview,
    totalDuration: player.totalDuration,
    currentTime: player.currentTime,
    trimIn: player.trimIn,
    trimOut: player.trimOut,
    aspectRatio: player.aspectRatio,
    subtitleMode,
    staticText,
    geminiPrompt,
    fontFamily,
    textColor,
    bgColor,
    strokeColor,
    fontSize,
    useBackgroundBox,
    selectedWatermarkId: watermark.selectedWatermarkId,
    watermarkPosition: watermark.watermarkPosition,
    watermarkOpacity: watermark.watermarkOpacity,
    watermarkScale: watermark.watermarkScale,
    dynamicSegments: subtitles.dynamicSegments,
    userWatermarks: watermark.userWatermarks,
    setTrimIn: player.setTrimIn,
    setTrimOut: player.setTrimOut,
    setAspectRatio: player.setAspectRatio,
    setSubtitleMode,
    setStaticText,
    setGeminiPrompt,
    setDynamicSegments: subtitles.setDynamicSegments,
    setFontFamily,
    setTextColor,
    setBgColor,
    setStrokeColor,
    setFontSize,
    setUseBackgroundBox,
    setSelectedWatermarkId: watermark.setSelectedWatermarkId,
    setWatermarkPosition: watermark.setWatermarkPosition,
    setWatermarkOpacity: watermark.setWatermarkOpacity,
    setWatermarkScale: watermark.setWatermarkScale,
    seekVideoTo: player.seekVideoTo,
    onMarkWatermarkAsSelected: watermark.markWatermarkAsSelected,
  });

  // 8. Renderização / Exportação do Vídeo
  const render = useStudioRender({
    currentVideo: queue.currentVideo,
    params,
    selectedMediaFile: subtitles.selectedMediaFile,
    aspectRatio: player.aspectRatio,
    trimIn: player.trimIn,
    trimOut: player.trimOut,
    selectedWatermarkId: watermark.selectedWatermarkId,
    watermarkPosition: watermark.watermarkPosition,
    watermarkScale: watermark.watermarkScale,
    watermarkOpacity: watermark.watermarkOpacity,
    subtitleMode,
    staticText,
    geminiPrompt,
    dynamicSegments: subtitles.dynamicSegments,
    fontFamily,
    fontSize,
    textColor,
    bgColor,
    strokeColor,
    useBackgroundBox,
    isGeminiConnected,
    videoQueue: queue.videoQueue,
    activeQueueIndex: queue.activeQueueIndex,
    setActiveQueueIndex: queue.setActiveQueueIndex,
    completedVideoIds: queue.completedVideoIds,
    setCompletedVideoIds: queue.setCompletedVideoIds,
    setIsPlaying: player.setIsPlaying,
    pauseVideo: player.pauseVideo,
    navigate,
  });

  // Handler para exclusão com limpeza de preview e reset dos estados locais
  const handleDeleteFromStudio = async () => {
    await queue.handleDeleteFromStudio(player.previewStreamUrl, () => {
      player.setPreviewStreamUrl(null);
      player.setWaveformPeaks([]);
      player.setTotalDuration(0.0);
      player.setTrimIn(0.0);
      player.setTrimOut(0.0);
      player.setCurrentTime(0.0);
      setStaticText('');
      setGeminiPrompt('');
      subtitles.setDynamicSegments([]);
    });
  };

  return {
    // Queue
    videoQueue: queue.videoQueue,
    activeQueueIndex: queue.activeQueueIndex,
    setActiveQueueIndex: queue.setActiveQueueIndex,
    completedVideoIds: queue.completedVideoIds,
    currentVideo: queue.currentVideo,
    studioProjectTitle: queue.studioProjectTitle,
    isDeleteStudioModalOpen: queue.isDeleteStudioModalOpen,
    setIsDeleteStudioModalOpen: queue.setIsDeleteStudioModalOpen,
    isDeletingFromStudio: queue.isDeletingFromStudio,
    setIsDeletingFromStudio: queue.setIsDeletingFromStudio,
    handleDeleteFromStudio,

    // Player
    aspectRatio: player.aspectRatio,
    setAspectRatio: player.setAspectRatio,
    isPlaying: player.isPlaying,
    setIsPlaying: player.setIsPlaying,
    isMuted: player.isMuted,
    setIsMuted: player.setIsMuted,
    currentTime: player.currentTime,
    setCurrentTime: player.setCurrentTime,
    totalDuration: player.totalDuration,
    setTotalDuration: player.setTotalDuration,
    trimIn: player.trimIn,
    setTrimIn: player.setTrimIn,
    trimOut: player.trimOut,
    setTrimOut: player.setTrimOut,
    waveformPeaks: player.waveformPeaks,
    isPreparingPreview: player.isPreparingPreview,
    previewError: player.previewError,
    previewStreamUrl: player.previewStreamUrl,
    currentPreviewId: player.currentPreviewId,
    isAuthError: player.isAuthError,
    videoRef: player.videoRef,
    timelineRef: player.timelineRef,
    seekVideoTo: player.seekVideoTo,
    handleTogglePlay: player.handleTogglePlay,
    pauseVideo: player.pauseVideo,
    initialSeekTimeRef: player.initialSeekTimeRef,
    lastTimeRef: player.lastTimeRef,
    handleTimelineMouseDown: player.handleTimelineMouseDown,
    handleTimelineClick: player.handleTimelineClick,
    loadVideoPreview: player.loadVideoPreview,

    // Canvas
    canvasRef: canvas.canvasRef,

    // Subtitles & Tab
    activeTab,
    setActiveTab,
    subtitleMode,
    setSubtitleMode,
    staticText,
    setStaticText,
    geminiPrompt,
    setGeminiPrompt,
    fontFamily,
    setFontFamily,
    textColor,
    setTextColor,
    bgColor,
    setBgColor,
    strokeColor,
    setStrokeColor,
    handleResetColors,
    fontSize,
    setFontSize,
    useBackgroundBox,
    setUseBackgroundBox,
    mediaFileInputRef,
    isGeminiConnected,
    isLoadingGeminiStatus,
    isTranscribingAudio: subtitles.isTranscribingAudio,
    selectedMediaFile: subtitles.selectedMediaFile,
    setSelectedMediaFile: subtitles.setSelectedMediaFile,
    dynamicSegments: subtitles.dynamicSegments,
    handleTranscribeCurrentVideo: subtitles.handleTranscribeCurrentVideo,

    // Watermarks
    userWatermarks: watermark.userWatermarks,
    isLoadingWatermarks: watermark.isLoadingWatermarks,
    selectedWatermarkId: watermark.selectedWatermarkId,
    setSelectedWatermarkId: watermark.setSelectedWatermarkId,
    watermarkPosition: watermark.watermarkPosition,
    setWatermarkPosition: watermark.setWatermarkPosition,
    watermarkOpacity: watermark.watermarkOpacity,
    setWatermarkOpacity: watermark.setWatermarkOpacity,
    watermarkScale: watermark.watermarkScale,
    setWatermarkScale: watermark.setWatermarkScale,

    // Render
    isGenerating: render.isGenerating,
    renderProgress: render.renderProgress,
    handleGenerateVideo: render.handleGenerateVideo,

    // Persistence
    handleResetStudio: persistence.handleResetStudio,

    // Navigation & Params
    navigate,
    params,
  };
};
