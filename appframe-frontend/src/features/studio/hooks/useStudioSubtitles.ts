import { useState } from 'react';
import { toast } from 'sonner';
import { mediaService, type GeminiSubtitleSegment } from '../../history';
import type { SubtitleMode } from '../types';

interface UseStudioSubtitlesProps {
  isGeminiConnected: boolean;
  currentVideoUrl?: string;
  currentPreviewId?: string | null;
  trimIn: number;
  trimOut: number;
  totalDuration: number;
  setSubtitleMode: (mode: SubtitleMode) => void;
  setCurrentTime: (time: number) => void;
}

export const useStudioSubtitles = ({
  isGeminiConnected,
  currentVideoUrl,
  currentPreviewId,
  trimIn,
  trimOut,
  totalDuration,
  setSubtitleMode,
  setCurrentTime,
}: UseStudioSubtitlesProps) => {
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [dynamicSegments, setDynamicSegments] = useState<GeminiSubtitleSegment[]>([]);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);

  const handleTranscribeCurrentVideo = async () => {
    if (!isGeminiConnected) {
      toast.error(
        'O assistente de inteligência artificial (Gemini) não está configurado na plataforma. Contate o administrador.'
      );
      return;
    }

    if (!currentVideoUrl && !selectedMediaFile && !currentPreviewId) {
      toast.error('Nenhum vídeo carregado no Studio para transcrição.');
      return;
    }

    setIsTranscribingAudio(true);
    try {
      const result = await mediaService.transcribeVideoAudio({
        file: selectedMediaFile,
        previewId: currentPreviewId || undefined,
        sourceUrl: currentVideoUrl || undefined,
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
        toast.info('Nenhuma fala foi detectada no áudio do vídeo.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Falha ao transcrever áudio do vídeo pelo Google Gemini.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  return {
    isTranscribingAudio,
    dynamicSegments,
    setDynamicSegments,
    selectedMediaFile,
    setSelectedMediaFile,
    handleTranscribeCurrentVideo,
  };
};
