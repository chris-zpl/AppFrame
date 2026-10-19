import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { ScraperController } from './scraper.controller';
import { YouTubeScraperProvider } from './providers/youtube-scraper.provider';
import { RedisModule } from '../../core/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [ScraperController],
  providers: [ScraperService, YouTubeScraperProvider],
  exports: [ScraperService, YouTubeScraperProvider],
})
export class ScraperModule {}
