import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { YouTubeScraperProvider } from './providers/youtube-scraper.provider';

@Module({
  controllers: [ScraperController],
  providers: [ScraperService, YouTubeScraperProvider],
  exports: [ScraperService, YouTubeScraperProvider],
})
export class ScraperModule {}
