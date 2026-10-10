import { Module } from '@nestjs/common';
import { SubtitlesService } from './subtitles.service';
import { SubtitlesController } from './subtitles.controller';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [SubtitlesController],
  providers: [SubtitlesService],
  exports: [SubtitlesService],
})
export class SubtitlesModule {}
