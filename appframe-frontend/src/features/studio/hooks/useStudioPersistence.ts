import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { StudioVideoQueueItem, SubtitleSegmentData } from '../../history';
import type { AspectRatio, FontFamily, SubtitleMode, WatermarkPosition } from '../types';
import type { WatermarkItem } from '../../watermarks';
import { saveStudioState, removeStudioState, purgeStaleStudioStates } from '../utils';
import { DEFAULT_SUBTITLE_COLORS } from '../constants';

export interface UseStudioPersistenceProps {
  currentVideo: StudioVideoQueueItem | null;
  isPreparingPreview: boolean;
  totalDuration: number;
  currentTime: number;
  trimIn: number;
  trimOut: number;
  aspectRatio: AspectRatio;
  subtitleMode: SubtitleMode;
  staticText: string;
  geminiPrompt: string;
  fontFamily: FontFamily;
  textColor: string;
  bgColor: string;
  strokeColor: string;
  fontSize: number;
  useBackgroundBox: boolean;
  selectedWatermarkId: string;
  watermarkPosition: WatermarkPosition;
  watermarkOpacity: number;
  watermarkScale: number;
  dynamicSegments: SubtitleSegmentData[];
  userWatermarks: WatermarkItem[];
  setTrimIn: (val: number) => void;
  setTrimOut: (val: number) => void;
  setAspectRatio: (val: AspectRatio) => void;
  setSubtitleMode: (val: SubtitleMode) => void;
  setStaticText: (val: string) => void;
  setGeminiPrompt: (val: string) => void;
  setDynamicSegments: (val: SubtitleSegmentData[]) => void;
  setFontFamily: (val: FontFamily) => void;
  setTextColor: (val: string) => void;
  setBgColor: (val: string) => void;
  setStrokeColor: (val: string) => void;
  setFontSize: (val: number) => void;
  setUseBackgroundBox: (val: boolean) => void;
  setSelectedWatermarkId: (val: string) => void;
  setWatermarkPosition: (val: WatermarkPosition) => void;
  setWatermarkOpacity: (val: number) => void;
  setWatermarkScale: (val: number) => void;
  seekVideoTo: (val: number) => void;
  onMarkWatermarkAsSelected?: () => void;
  isStudioBusy?: boolean;
}

export const useStudioPersistence = ({
  currentVideo,
  isPreparingPreview: _isPreparingPreview,
  totalDuration,
  currentTime,
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
  userWatermarks,
  setTrimIn,
  setTrimOut,
  setAspectRatio,
  setSubtitleMode,
  setStaticText,
  setGeminiPrompt,
  setDynamicSegments,
  setFontFamily,
  setTextColor,
  setBgColor,
  setStrokeColor,
  setFontSize,
  setUseBackgroundBox,
  setSelectedWatermarkId,
  setWatermarkPosition,
  setWatermarkOpacity,
  setWatermarkScale,
  seekVideoTo,
  onMarkWatermarkAsSelected,
  isStudioBusy = false,
}: UseStudioPersistenceProps) => {
  // Higienização automática de rascunhos órfãos (> 7 dias) executada uma única vez na entrada do Studio
  useEffect(() => {
    purgeStaleStudioStates();
  }, []);

  // Mantém referência sempre atualizada do estado completo do Studio
  const stateRef = useRef({
    trimIn,
    trimOut,
    currentTime,
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
  });

  useEffect(() => {
    stateRef.current = {
      trimIn,
      trimOut,
      currentTime,
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
  });

  // Salva imediatamente quando configurações visuais/estilo/cortes mudarem
  useEffect(() => {
    if (!currentVideo) return;
    saveStudioState(currentVideo, stateRef.current);
  }, [
    currentVideo,
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

  // Salva currentTime com debounce suave durante playback
  useEffect(() => {
    if (!currentVideo) return;
    const timer = setTimeout(() => {
      saveStudioState(currentVideo, stateRef.current);
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentTime, currentVideo]);

  // Garante persistência estrita ao desmontar o componente ou recarregar a janela
  useEffect(() => {
    const handleExit = () => {
      if (currentVideo) {
        saveStudioState(currentVideo, stateRef.current);
      }
    };
    window.addEventListener('beforeunload', handleExit);
    return () => {
      window.removeEventListener('beforeunload', handleExit);
      handleExit();
    };
  }, [currentVideo]);

  // Restaura todas as configurações do Studio para o padrão de fábrica
  const handleResetStudio = () => {
    if (isStudioBusy || !currentVideo) return;
    removeStudioState(currentVideo);

    setTrimIn(0.0);
    setTrimOut(totalDuration > 0 ? totalDuration : 0.0);
    setAspectRatio(currentVideo.isShort ? '9:16' : '16:9');
    setSubtitleMode('static');
    setStaticText(currentVideo.title || '');
    setGeminiPrompt(currentVideo.title || '');
    setDynamicSegments([]);
    setFontFamily('Plus Jakarta Sans');
    setTextColor(DEFAULT_SUBTITLE_COLORS.textColor);
    setBgColor(DEFAULT_SUBTITLE_COLORS.bgColor);
    setStrokeColor(DEFAULT_SUBTITLE_COLORS.strokeColor);
    setFontSize(28);
    setUseBackgroundBox(true);
    if (onMarkWatermarkAsSelected) {
      onMarkWatermarkAsSelected();
    }
    const defaultWmId = localStorage.getItem('appframe_default_watermark_id');
    const resetWmId = defaultWmId && userWatermarks.some((w) => w.id === defaultWmId)
      ? defaultWmId
      : 'none';
    setSelectedWatermarkId(resetWmId);
    setWatermarkPosition('top-right');
    setWatermarkOpacity(85);
    setWatermarkScale(100);
    seekVideoTo(0.0);

    toast.success('Configurações do Studio restauradas para o padrão de fábrica.');
  };

  return {
    handleResetStudio,
  };
};
