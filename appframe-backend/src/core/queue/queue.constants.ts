import { SubtitleConfig } from '../../modules/media/interfaces/subtitle-config.interface';

export const MEDIA_DOWNLOAD_QUEUE = 'media:download';
export const MEDIA_RENDER_QUEUE = 'media:render';

export interface DownloadJobPayload {
  jobId: string;
  userId: string;
  sourceUrl: string;
}

export interface RenderJobPayload {
  jobId: string;
  userId: string;
  localSourcePath: string;
  trimStart?: number | null;
  trimEnd?: number | null;
  watermarkId?: string | null;
  subtitleConfig?: SubtitleConfig | null;
}
