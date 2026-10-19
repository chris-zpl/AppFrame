import api from '../../../lib/api';

export interface ScrapedMediaItem {
  id: string;
  url: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  durationFormatted: string;
  isShort: boolean;
  publishedAt?: string;
  // Fallbacks de compatibilidade
  duration?: number;
  thumbnail_url?: string;
  duration_seconds?: number;
  timestamp_formatted?: string;
  is_short?: boolean;
  viewCount?: string;
  isTargetVideo?: boolean;
  selected?: boolean;
  channelTitle?: string;
  channelAvatarUrl?: string;
  channelUrl?: string;
  hasMore?: boolean;
}

export interface ScrapedVideoMetadata {
  id: string;
  url: string;
  title: string;
  duration: number;
  durationFormatted: string;
  thumbnailUrl: string;
  platform: string;
  author: string;
}

export const scraperService = {
  async scanChannel(channelUrl: string): Promise<ScrapedMediaItem[]> {
    const res = await api.post<ScrapedMediaItem[]>(
      '/scraper/scan',
      { channelUrl },
      { timeout: 60000 },
    );
    return res.data;
  },

  async fetchMore(
    channelUrl: string,
    type: 'all' | 'long' | 'shorts' = 'all',
  ): Promise<ScrapedMediaItem[]> {
    const res = await api.post<ScrapedMediaItem[]>(
      '/scraper/more',
      { channelUrl, type },
      { timeout: 30000 },
    );
    return res.data;
  },

  async inspect(url: string): Promise<ScrapedVideoMetadata> {
    const res = await api.post<ScrapedVideoMetadata>('/scraper/inspect', {
      url,
    });
    return res.data;
  },
};

export const scannerService = scraperService;
