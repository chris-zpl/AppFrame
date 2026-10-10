import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ScraperService, ScrapedVideoMetadata } from './scraper.service';
import { ScrapeRequestDto } from './dto/scrape-request.dto';
import { ScanChannelDto } from './dto/scan-channel.dto';
import { ScrapedMediaItem } from './interfaces/scraped-media-item.interface';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('inspect')
  @HttpCode(HttpStatus.OK)
  async inspect(@Body() dto: ScrapeRequestDto): Promise<ScrapedVideoMetadata> {
    return this.scraperService.extractMetadata(dto.url);
  }

  @Post('channel')
  @HttpCode(HttpStatus.OK)
  async scanChannel(
    @Body() dto: ScanChannelDto,
  ): Promise<ScrapedMediaItem[]> {
    return this.scraperService.scanChannel(dto.channelUrl);
  }
}
