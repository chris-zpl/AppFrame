import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  mediaService,
  type CreateVideoJobPayload,
  type StudioVideoQueueItem,
  type SubtitleLineData,
  type SubtitleSegmentData,
} from '../../history';
import type { AspectRatio, FontFamily, SubtitleMode, WatermarkPosition } from '../interfaces';

export interface UseStudioRenderProps {
  currentVideo: StudioVideoQueueItem | null;
  params: {
    videoUrl?: string;
    sourceUrl?: string;
    selectedVideos?: string;
    videoTitle?: string;
  };
  selectedMediaFile: File | null;
  aspectRatio: AspectRatio;
  trimIn: number;
  trimOut: number;
  selectedWatermarkId: string;
  watermarkPosition: WatermarkPosition;
  watermarkScale: number;
  watermarkOpacity: number;
  subtitleMode: SubtitleMode;
  staticText: string;
  geminiPrompt: string;
  dynamicSegments: SubtitleSegmentData[];
  fontFamily: FontFamily;
  fontSize: number;
  textColor: string;
  bgColor: string;
  strokeColor: string;
  useBackgroundBox: boolean;
  isGeminiConnected: boolean;
  videoQueue: StudioVideoQueueItem[];
  activeQueueIndex: number;
  setActiveQueueIndex: (index: number) => void;
  completedVideoIds: string[];
  setCompletedVideoIds: (ids: string[]) => void;
  setIsPlaying: (playing: boolean) => void;
  navigate: (path: string, params?: Record<string, string>) => void;
}

export const useStudioRender = ({
  currentVideo,
  params,
  selectedMediaFile,
  aspectRatio,
  trimIn,
  trimOut,
  selectedWatermarkId,
  watermarkPosition,
  watermarkScale,
  watermarkOpacity,
  subtitleMode,
  staticText,
  geminiPrompt,
  dynamicSegments,
  fontFamily,
  fontSize,
  textColor,
  bgColor,
  strokeColor,
  useBackgroundBox,
  isGeminiConnected,
  videoQueue,
  activeQueueIndex,
  setActiveQueueIndex,
  completedVideoIds,
  setCompletedVideoIds,
  setIsPlaying,
  navigate,
}: UseStudioRenderProps) => {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);

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

      // Aguarda a conclusão do processamento FFmpeg no backend
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

  return {
    isGenerating,
    renderProgress,
    handleGenerateVideo,
  };
};
