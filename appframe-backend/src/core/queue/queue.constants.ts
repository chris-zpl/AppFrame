import { SubtitleConfig } from '../../modules/media/interfaces/subtitle-config.interface';

export const MEDIA_DOWNLOAD_QUEUE = 'media-download';
export const MEDIA_RENDER_QUEUE = 'media-render';

export interface DownloadJobPayload {
  jobId: string;
  userId: string;
  sourceUrl: string;
}

export interface RenderJobPayload {
  jobId: string;
  userId: string;
  localSourcePath: string;
  aspectRatio?: string | null;
  trimStart?: number | null;
  trimEnd?: number | null;
  watermarkId?: string | null;
  watermarkPosition?: string | null;
  watermarkScale?: number | null;
  watermarkOpacity?: number | null;
  subtitleConfig?: SubtitleConfig | null;
}
