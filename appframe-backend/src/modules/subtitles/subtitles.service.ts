import { Injectable, Logger } from '@nestjs/common';
import { SubtitleConfig } from '../media/interfaces/subtitle-config.interface';

export interface GeneratedSubtitleItem {
  start: number;
  end: number;
  text: string;
}

@Injectable()
export class SubtitlesService {
  private readonly logger = new Logger(SubtitlesService.name);

  async generateSubtitles(
    audioOrVideoPath: string,
    config?: SubtitleConfig,
  ): Promise<GeneratedSubtitleItem[]> {
    this.logger.log(`Iniciando transcrição de legendas para ${audioOrVideoPath}`);
    // Mock representativo para a arquitetura com modelo Whisper / IA
    return [
      {
        start: 0.0,
        end: 2.5,
        text: config?.text || 'Transcrição automática com IA',
      },
    ];
  }
}
