import { SubtitleConfig } from '../../modules/media/interfaces/subtitle-config.interface';

export const MEDIA_DOWNLOAD_QUEUE = 'media-download';
export const MEDIA_RENDER_QUEUE = 'media-render';
export const RENDER_QUEUE = MEDIA_RENDER_QUEUE;
export const STORAGE_CLEANUP_QUEUE = 'storage-cleanup';
export const STUDIO_PREVIEW_QUEUE = 'studio-preview';

export interface StudioPreviewJobPayload {
  previewId: string;
  sourceUrl: string;
  userId?: string;
}

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

export interface StorageCleanupJobPayload {
  jobId?: string;
  userId?: string;
  filePath: string;
  reason?: 'expired_24h' | 'cancelled' | 'temp_cleanup';
}
