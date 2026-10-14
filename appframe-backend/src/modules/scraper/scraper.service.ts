import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VideoPlatform } from '../media/enums/video-platform.enum';
import { IVideoScraperProvider } from './interfaces/video-scraper-provider.interface';
import { ScrapedMediaItem } from './interfaces/scraped-media-item.interface';
import { YouTubeScraperProvider } from './providers/youtube-scraper.provider';

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
  private readonly providers: IVideoScraperProvider[];

  constructor(private readonly youtubeProvider: YouTubeScraperProvider) {
    this.providers = [this.youtubeProvider];
  }

  /**
   * Identifica a plataforma da URL de mídia
   */
  detectPlatform(url: string): VideoPlatform {
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.startsWith('@')) {
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

  /**
   * Localiza o provider adequado e escaneia os vídeos e Shorts do canal
   */
  async scanChannel(channelUrl: string): Promise<ScrapedMediaItem[]> {
    const provider = this.providers.find((p) => p.canHandle(channelUrl));

    if (!provider) {
      throw new BadRequestException(
        `Nenhum provedor de scraping disponível para o link informado: ${channelUrl}`,
      );
    }

    this.logger.log(
      `Utilizando provider "${provider.providerName}" para escanear canal: ${channelUrl}`,
    );

    return provider.scanChannel(channelUrl);
  }

  /**
   * Extração rápida de metadados para URLs individuais
   */
  async extractMetadata(url: string): Promise<ScrapedVideoMetadata> {
    const platform = this.detectPlatform(url);
    this.logger.log(`Extraindo metadados para URL da plataforma ${platform}: ${url}`);

    if (platform === VideoPlatform.YOUTUBE) {
      const match = url.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([\w-]{11})/);
      if (match && match[1]) {
        const id = match[1];
        let durationSeconds = 60;
        try {
          const realDuration = await this.youtubeProvider.fetchVideoRealDuration(id);
          if (realDuration > 0) {
            durationSeconds = realDuration;
          }
        } catch {}

        return {
          url,
          platform,
          title: `Vídeo do YouTube (${id})`,
          durationSeconds,
          thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
      }
    }

    return {
      url,
      platform,
      title: 'Vídeo importado',
      durationSeconds: 60,
    };
  }
}
