import { useEffect } from 'react';
import { toast } from 'sonner';
import type { StudioVideoQueueItem, SubtitleSegmentData } from '../../history';
import type { AspectRatio, FontFamily, SubtitleMode, WatermarkPosition } from '../types';
import type { WatermarkItem } from '../../watermarks';

export interface UseStudioPersistenceProps {
  currentVideo: StudioVideoQueueItem | null;
  isPreparingPreview: boolean;
  totalDuration: number;
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
}

export const useStudioPersistence = ({
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
}: UseStudioPersistenceProps) => {
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
    if (onMarkWatermarkAsSelected) {
      onMarkWatermarkAsSelected();
    }
    setSelectedWatermarkId(userWatermarks[0]?.id || 'none');
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
