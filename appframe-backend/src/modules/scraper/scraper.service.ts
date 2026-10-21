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
  channelTitle?: string;
  channelAvatarUrl?: string;
  channelUrl?: string;
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
   * Extrai próxima página/lote de mídias do canal sob demanda
   */
  async fetchMore(
    channelUrl: string,
    type: 'all' | 'long' | 'shorts' = 'all',
  ): Promise<ScrapedMediaItem[]> {
    const provider = this.providers.find((p) => p.canHandle(channelUrl));

    if (!provider || !provider.fetchMore) {
      return [];
    }

    return provider.fetchMore(channelUrl, type);
  }

  /**
   * Extração rápida de metadados para URLs individuais
   */
  async extractMetadata(url: string): Promise<ScrapedVideoMetadata> {
    const platform = this.detectPlatform(url);
    this.logger.log(`Extraindo metadados para URL da plataforma ${platform}: ${url}`);

    if (platform === VideoPlatform.YOUTUBE) {
      const id = this.youtubeProvider.extractVideoId(url);
      if (id) {
        let title = `Vídeo do YouTube (${id})`;
        let durationSeconds = 60;
        let thumbnailUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        let channelTitle: string | undefined;
        let channelAvatarUrl: string | undefined;
        let channelUrl: string | undefined;

        try {
          const resolved = await this.youtubeProvider.resolveChannelFromVideo(id);
          if (resolved) {
            if (resolved.video?.title) {
              title = resolved.video.title;
            }
            if (resolved.video?.durationSeconds && resolved.video.durationSeconds > 0) {
              durationSeconds = resolved.video.durationSeconds;
            }
            if (resolved.video?.thumbnailUrl) {
              thumbnailUrl = resolved.video.thumbnailUrl;
            }
            channelTitle = resolved.channelTitle;
            channelAvatarUrl = resolved.channelAvatarUrl;
            channelUrl = resolved.channelUrl;
          }
        } catch {}

        if (durationSeconds === 60) {
          try {
            const realDuration = await this.youtubeProvider.fetchVideoRealDuration(id);
            if (realDuration > 0) {
              durationSeconds = realDuration;
            }
          } catch {}
        }

        return {
          url,
          platform,
          title,
          durationSeconds,
          thumbnailUrl,
          channelTitle,
          channelAvatarUrl,
          channelUrl,
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
