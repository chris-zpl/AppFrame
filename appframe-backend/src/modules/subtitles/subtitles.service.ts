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
    userId: string,
    audioOrVideoPath: string,
    _config?: SubtitleConfig,
  ): Promise<GeneratedSubtitleItem[]> {
    this.logger.log(`Iniciando transcrição de legendas com Gemini para ${audioOrVideoPath}`);

    const transcription = await this.geminiService.transcribeAudio(userId, {
      audioPath: audioOrVideoPath,
    });

    return transcription.segments || [];
  }
}
