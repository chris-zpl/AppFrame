import { Controller, Post, Body } from '@nestjs/common';
import { SubtitlesService, GeneratedSubtitleItem } from './subtitles.service';
import { SubtitleConfig } from '../media/interfaces/subtitle-config.interface';

@Controller('subtitles')
export class SubtitlesController {
  constructor(private readonly subtitlesService: SubtitlesService) {}

  @Post('generate')
  async generate(
    @Body('mediaPath') mediaPath: string,
    @Body('config') config?: SubtitleConfig,
  ): Promise<GeneratedSubtitleItem[]> {
    return this.subtitlesService.generateSubtitles(mediaPath, config);
  }
}
