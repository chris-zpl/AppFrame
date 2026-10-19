import type { VideoCardData } from '../../../components/common/VideoCard';

export interface ScrapedVideoCardData extends VideoCardData {
  url: string;
}

export interface ChannelMeta {
  name: string;
  avatarUrl?: string;
  totalIndexed: number;
  shortsCount: number;
  longCount: number;
  totalChannelVideos?: number;
}

export type ScannerFilterType = 'all' | 'long' | 'shorts';
