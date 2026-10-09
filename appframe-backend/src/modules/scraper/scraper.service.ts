import { Injectable, Logger } from '@nestjs/common';
import { VideoPlatform } from '../media/enums/video-platform.enum';

export interface ScrapedVideoMetadata {
  url: string;
  platform: VideoPlatform;
  title: string;
  durationSeconds: number;
  thumbnailUrl?: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  detectPlatform(url: string): VideoPlatform {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return VideoPlatform.YOUTUBE;
    }
    if (url.includes('tiktok.com')) {
      return VideoPlatform.TIKTOK;
    }
    if (url.includes('instagram.com')) {
      return VideoPlatform.INSTAGRAM;
    }
    return VideoPlatform.OTHER;
  }

  async extractMetadata(url: string): Promise<ScrapedVideoMetadata> {
    const platform = this.detectPlatform(url);
    this.logger.log(`Extraindo metadados para URL da plataforma ${platform}: ${url}`);

    // Mock seguro/arquitetural que será estendido por ferramentas de extração como yt-dlp
    return {
      url,
      platform,
      title: 'Vídeo importado',
      durationSeconds: 60,
    };
  }
}
