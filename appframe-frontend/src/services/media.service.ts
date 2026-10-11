import api from './api';

export type VideoJobStatus =
  | 'PENDING'
  | 'DOWNLOADING'
  | 'RENDERING'
  | 'COMPLETED'
  | 'FAILED';

export interface SubtitleConfigPayload {
  mode?: 'static' | 'dynamic';
  text?: string;
  font_family?: string;
  font_size?: number;
  text_color?: string;
  background_color?: string;
  stroke_color?: string;
  use_background_box?: boolean;
}

export interface CreateVideoJobPayload {
  source_url: string;
  platform?: 'youtube' | 'youtube_shorts' | 'tiktok' | 'instagram_reels' | 'other';
  original_title?: string;
  trim_start?: number;
  trim_end?: number;
  watermark_id?: string;
  subtitle_config?: SubtitleConfigPayload;
}

export interface VideoJobItem {
  id: string;
  user_id: string;
  source_url: string;
  platform: string;
  original_title?: string | null;
  status: VideoJobStatus;
  progress: number;
  trim_start?: number | null;
  trim_end?: number | null;
  watermark_id?: string | null;
  subtitle_config?: SubtitleConfigPayload | null;
  final_video_path?: string | null;
  error_log?: string | null;
  duration_seconds?: number | null;
  created_at: string;
  updated_at: string;
}

export const mediaService = {
  async listJobs(): Promise<VideoJobItem[]> {
    const res = await api.get<VideoJobItem[]>('/jobs');
    return res.data;
  },

  async getJobById(id: string): Promise<VideoJobItem> {
    const res = await api.get<VideoJobItem>(`/jobs/${id}`);
    return res.data;
  },

  async createJob(payload: CreateVideoJobPayload): Promise<VideoJobItem> {
    const res = await api.post<VideoJobItem>('/media/jobs', payload);
    return res.data;
  },

  async render(payload: CreateVideoJobPayload): Promise<VideoJobItem> {
    const res = await api.post<VideoJobItem>('/media/render', payload);
    return res.data;
  },

  async downloadBatch(videos: Array<{ url: string; title?: string }>): Promise<VideoJobItem[]> {
    const res = await api.post<VideoJobItem[]>('/media/download-batch', { videos });
    return res.data;
  },
};
