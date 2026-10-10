import { Injectable, Logger } from '@nestjs/common';
import { SubtitleConfig } from '../media/interfaces/subtitle-config.interface';
import { GeminiService } from '../gemini/gemini.service';

export interface GeneratedSubtitleItem {
  start: number;
  end: number;
  text: string;
}

@Injectable()
export class SubtitlesService {
  private readonly logger = new Logger(SubtitlesService.name);

  constructor(private readonly geminiService: GeminiService) {}

  async generateSubtitles(
    audioOrVideoPath: string,
    config?: SubtitleConfig,
  ): Promise<GeneratedSubtitleItem[]> {
    this.logger.log(`Iniciando transcrição de legendas com Gemini para ${audioOrVideoPath}`);

    try {
      const transcription = await this.geminiService.transcribeAudio({
        audioPath: audioOrVideoPath,
      });

      if (transcription.segments && transcription.segments.length > 0) {
        return transcription.segments;
      }
    } catch (err: any) {
      this.logger.warn(
        `Falha ao transcrever com Gemini (${err.message}). Utilizando fallback determinístico.`,
      );
    }

    return [
      {
        start: 0.0,
        end: 2.5,
        text: config?.text || 'Transcrição automática com Gemini AI',
      },
    ];
  }
}
