import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { SubtitlesService, GeneratedSubtitleItem } from './subtitles.service';
import { SubtitleConfig } from '../media/interfaces/subtitle-config.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('subtitles')
@UseGuards(JwtAuthGuard)
export class SubtitlesController {
  constructor(private readonly subtitlesService: SubtitlesService) {}

  @Post('generate')
  async generate(
    @CurrentUser('userId') userId: string,
    @Body('mediaPath') mediaPath: string,
    @Body('config') config?: SubtitleConfig,
  ): Promise<GeneratedSubtitleItem[]> {
    return this.subtitlesService.generateSubtitles(userId, mediaPath, config);
  }
}
