import { useState } from 'react';
import { toast } from 'sonner';
import { mediaService, type GeminiSubtitleSegment } from '../../history';
import type { SubtitleMode } from '../interfaces';

interface UseStudioSubtitlesProps {
  isGeminiConnected: boolean;
  videoTitle?: string;
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
  videoTitle,
  currentVideoUrl,
  currentPreviewId,
  trimIn,
  trimOut,
  totalDuration,
  setSubtitleMode,
  setCurrentTime,
}: UseStudioSubtitlesProps) => {
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [showAdvancedGeminiOptions, setShowAdvancedGeminiOptions] = useState(false);
  const [dynamicSegments, setDynamicSegments] = useState<GeminiSubtitleSegment[]>([]);
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);

  const handleGenerateGeminiSubtitles = async (promptContext: string) => {
    if (!isGeminiConnected) {
      toast.error(
        'O assistente de inteligência artificial (Gemini) não está configurado na plataforma. Contate o administrador.'
      );
      return;
    }

    const contextToUse = promptContext.trim() || videoTitle || 'Vídeo de Cortes';

    if (!contextToUse && !selectedMediaFile) {
      toast.error(
        'Selecione um arquivo de áudio/vídeo ou descreva o tema/roteiro do vídeo para gerar as legendas pelo Gemini.'
      );
      return;
    }

    setIsGeneratingSubtitles(true);
    try {
      const result = await mediaService.generateGeminiSubtitles({
        file: selectedMediaFile,
        title: videoTitle,
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
        err?.message ||
        'Falha ao gerar legendas pelo Google Gemini.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setIsGeneratingSubtitles(false);
    }
  };

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
      const result = await mediaService.generateGeminiSubtitles({
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
        toast.info(
          'Nenhuma fala foi detectada no áudio do vídeo. Caso o vídeo não possua narração, você pode gerar legendas por roteiro nas outras opções.'
        );
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
  };
};
