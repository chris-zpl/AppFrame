import api from './api';

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
      { timeout: 120000 },
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
