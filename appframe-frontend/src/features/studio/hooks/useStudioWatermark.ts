import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { watermarksService, type WatermarkItem } from '../../watermarks';
import type { WatermarkPosition } from '../types';
import type { StudioVideoQueueItem } from '../../history';
import { getSavedStudioState } from '../utils';

export interface UseStudioWatermarkProps {
  currentVideo: StudioVideoQueueItem | null;
}

export const useStudioWatermark = ({ currentVideo }: UseStudioWatermarkProps) => {
  // Consulta marcas d'água cadastradas
  const { data: userWatermarks = [], isLoading: isLoadingWatermarks } = useQuery({
    queryKey: ['watermarks'],
    queryFn: watermarksService.list,
  });

  const [selectedWatermarkId, setSelectedWatermarkId] = useState<string>('none');
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('top-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(85);
  const [watermarkScale, setWatermarkScale] = useState<number>(100);

  const hasAutoSelectedWatermarkRef = useRef<boolean>(false);

  // Seleciona automaticamente a primeira marca d'água na carga inicial apenas se não houver preferência salva
  useEffect(() => {
    if (hasAutoSelectedWatermarkRef.current) return;
    if (userWatermarks.length === 0) return;

    const saved = getSavedStudioState(currentVideo);
    const hasSavedWatermark = Boolean(saved && saved.selectedWatermarkId !== undefined);

    if (!hasSavedWatermark) {
      const defaultId = localStorage.getItem('appframe_default_watermark_id');
      const targetId = defaultId && userWatermarks.some((w) => w.id === defaultId)
        ? defaultId
        : 'none';
      queueMicrotask(() => {
        setSelectedWatermarkId(targetId);
      });
    }
    hasAutoSelectedWatermarkRef.current = true;
  }, [userWatermarks, currentVideo]);

  const selectedLogo: WatermarkItem | null = useMemo(() => {
    if (!selectedWatermarkId || selectedWatermarkId === 'none') return null;
    return userWatermarks.find((w) => w.id === selectedWatermarkId) || null;
  }, [userWatermarks, selectedWatermarkId]);

  const markWatermarkAsSelected = useCallback(() => {
    hasAutoSelectedWatermarkRef.current = true;
  }, []);

  return {
    userWatermarks,
    isLoadingWatermarks,
    selectedWatermarkId,
    setSelectedWatermarkId,
    watermarkPosition,
    setWatermarkPosition,
    watermarkOpacity,
    setWatermarkOpacity,
    watermarkScale,
    setWatermarkScale,
    selectedLogo,
    hasAutoSelectedWatermarkRef,
    markWatermarkAsSelected,
  };
};
