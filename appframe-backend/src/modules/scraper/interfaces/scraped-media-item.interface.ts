export interface ScrapedMediaItem {
  id: string;
  url: string;
  title: string;
  thumbnailUrl: string;
  thumbnail_url: string;
  durationSeconds: number;
  duration_seconds: number;
  durationFormatted: string;
  timestamp_formatted: string;
  isShort: boolean;
  is_short?: boolean;
  publishedAt?: string;
  published_text?: string;
  view_count_text?: string;
  isTargetVideo?: boolean;
  selected?: boolean;
  channelTitle?: string;
  channelAvatarUrl?: string;
  channelUrl?: string;
  hasMore?: boolean;
}
