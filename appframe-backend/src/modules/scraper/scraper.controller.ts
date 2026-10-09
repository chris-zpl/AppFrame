import { Controller, Post, Body } from '@nestjs/common';
import { ScraperService, ScrapedVideoMetadata } from './scraper.service';
import { ScrapeRequestDto } from './dto/scrape-request.dto';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post('inspect')
  async inspect(@Body() dto: ScrapeRequestDto): Promise<ScrapedVideoMetadata> {
    return this.scraperService.extractMetadata(dto.url);
  }
}
