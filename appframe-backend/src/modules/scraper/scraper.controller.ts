import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ScraperService, ScrapedVideoMetadata } from './scraper.service';
import { ScrapeRequestDto } from './dto/scrape-request.dto';
import { ScanChannelDto } from './dto/scan-channel.dto';
import { ScanMoreDto } from './dto/scan-more.dto';
import { ScrapedMediaItem } from './interfaces/scraped-media-item.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('scraper')
@UseGuards(JwtAuthGuard)
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('inspect')
  @HttpCode(HttpStatus.OK)
  async inspect(@Body() dto: ScrapeRequestDto): Promise<ScrapedVideoMetadata> {
    return this.scraperService.extractMetadata(dto.url);
  }

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scan(@Body() dto: ScanChannelDto): Promise<ScrapedMediaItem[]> {
    return this.scraperService.scanChannel(dto.channelUrl);
  }

  @Post('channel')
  @HttpCode(HttpStatus.OK)
  async scanChannel(
    @Body() dto: ScanChannelDto,
  ): Promise<ScrapedMediaItem[]> {
    return this.scraperService.scanChannel(dto.channelUrl);
  }

  @Post('more')
  @HttpCode(HttpStatus.OK)
  async fetchMore(
    @Body() dto: ScanMoreDto,
  ): Promise<ScrapedMediaItem[]> {
    return this.scraperService.fetchMore(dto.channelUrl, dto.type || 'all');
  }
}
