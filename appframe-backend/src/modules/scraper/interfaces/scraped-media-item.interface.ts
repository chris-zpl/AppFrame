export interface ScrapedMediaItem {
  id: string;
  url: string;
  title: string;
  duration_seconds: number;
  timestamp_formatted: string; // Formato estrito HH:MM:SS
  thumbnail_url: string;
  is_short?: boolean;
  published_text?: string;
  view_count_text?: string;
}
