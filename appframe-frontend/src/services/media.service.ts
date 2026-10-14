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
  platform?: 'youtube' | 'tiktok' | 'instagram' | 'other';
  original_title?: string;
  aspect_ratio?: '9:16' | '16:9';
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
  aspect_ratio?: string | null;
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

export interface GeminiSubtitleSegment {
  start: number;
  end: number;
  text: string;
}

export interface GeminiSubtitlesResponse {
  fullText: string;
  language?: string;
  segments: GeminiSubtitleSegment[];
}

export interface StudioVideoQueueItem {
  id: string;
  url: string;
  title: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  isShort?: boolean;
}

export interface StudioPreviewResponse {
  previewId: string;
  streamUrl: string;
  durationSeconds: number;
  width: number;
  height: number;
  waveformPeaks?: number[];
}

const normalizeJob = (job: any): VideoJobItem => {
  if (!job) return job;
  return {
    ...job,
    status: (String(job.status || '').toUpperCase()) as VideoJobStatus,
  };
};

export const mediaService = {
  async listJobs(): Promise<VideoJobItem[]> {
    const res = await api.get<any[]>('/jobs');
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map(normalizeJob);
  },

  async getJobById(id: string): Promise<VideoJobItem> {
    const res = await api.get<any>(`/jobs/${id}`);
    return normalizeJob(res.data);
  },

  async createJob(payload: CreateVideoJobPayload): Promise<VideoJobItem> {
    const res = await api.post<any>('/media/jobs', payload);
    return normalizeJob(res.data);
  },

  async render(payload: CreateVideoJobPayload): Promise<VideoJobItem> {
    const res = await api.post<any>('/media/render', payload);
    return normalizeJob(res.data);
  },

  async downloadBatch(videos: Array<{ url: string; title?: string }>): Promise<VideoJobItem[]> {
    const res = await api.post<any[]>('/media/download-batch', { videos });
    const items = Array.isArray(res.data) ? res.data : [];
    return items.map(normalizeJob);
  },

  async deleteJob(id: string): Promise<{ success: boolean }> {
    const res = await api.delete<{ success: boolean }>(`/jobs/${id}`);
    return res.data;
  },

  async prepareStudioPreview(sourceUrl: string): Promise<StudioPreviewResponse> {
    const res = await api.post<any>('/media/preview', { source_url: sourceUrl });
    return res.data?.data || res.data;
  },

  async deleteStudioPreview(previewId: string): Promise<{ success: boolean }> {
    const res = await api.delete<{ success: boolean }>(`/media/preview/${previewId}`);
    return res.data;
  },

  async downloadJobFile(jobId: string, title?: string | null): Promise<void> {
    const res = await api.get(`/media/jobs/${jobId}/download`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'video/mp4' });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (title || `video_${jobId.substring(0, 8)}`)
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u017F\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 80);

    link.href = objectUrl;
    link.setAttribute('download', `${safeTitle || 'video_appframe'}.mp4`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 10000);
  },

  async getGeminiStatus(): Promise<{ connected: boolean }> {
    const res = await api.get<any>('/gemini/status');
    return res.data?.data || res.data;
  },

  async connectGeminiAccount(apiKey: string): Promise<{ connected: boolean }> {
    const res = await api.post<any>('/gemini/connect', { apiKey });
    return res.data?.data || res.data;
  },

  async disconnectGeminiAccount(): Promise<{ connected: boolean }> {
    const res = await api.delete<any>('/gemini/disconnect');
    return res.data?.data || res.data;
  },

  async generateGeminiSubtitles(params: {
    file?: File | null;
    title?: string;
    context?: string;
    durationSeconds?: number;
    language?: string;
  }): Promise<GeminiSubtitlesResponse> {
    if (params.file) {
      const formData = new FormData();
      formData.append('file', params.file);
      if (params.title) formData.append('title', params.title);
      if (params.context) formData.append('context', params.context);
      if (params.durationSeconds) formData.append('durationSeconds', String(params.durationSeconds));
      if (params.language) formData.append('language', params.language);

      const res = await api.post<any>('/gemini/subtitles', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data || res.data;
    }

    const res = await api.post<any>('/gemini/subtitles', {
      title: params.title,
      context: params.context,
      durationSeconds: params.durationSeconds,
      language: params.language,
    });
    return res.data?.data || res.data;
  },
};
