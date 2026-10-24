import api from '../../../lib/api';

export type VideoJobStatus =
  | 'PENDING'
  | 'DOWNLOADING'
  | 'RENDERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export interface SubtitleLineData {
  text: string;
  width?: number;
}

export interface SubtitleSegmentData {
  start: number;
  end: number;
  text: string;
  lines?: SubtitleLineData[];
  overlay_image?: string;
}

export interface SubtitleConfigPayload {
  mode?: 'static' | 'dynamic';
  text?: string;
  lines?: SubtitleLineData[];
  segments?: SubtitleSegmentData[];
  overlay_image?: string;
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
  watermark_position?: string;
  watermark_scale?: number;
  watermark_opacity?: number;
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
  watermark_position?: string | null;
  watermark_scale?: number | null;
  watermark_opacity?: number | null;
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

export type StudioPreviewStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface StudioPreviewResponse {
  previewId: string;
  status?: StudioPreviewStatus;
  progress?: number;
  streamUrl: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  waveformPeaks?: number[];
  error?: string;
  message?: string;
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

  async prepareStudioPreview(
    sourceUrl: string,
    signal?: AbortSignal,
    onProgress?: (state: StudioPreviewResponse) => void
  ): Promise<StudioPreviewResponse> {
    const res = await api.post<any>(
      '/media/preview',
      { source_url: sourceUrl },
      {
        timeout: 300000,
        signal,
      }
    );
    const data = res.data?.data || res.data;

    // Se a resposta retornou imediatamente como PROCESSING (202 Accepted),
    // realiza polling resiliente no endpoint de status até a conclusão do job no BullMQ
    if (data && (data.status === 'PROCESSING' || data.status === 'PENDING') && data.previewId) {
      if (onProgress) {
        onProgress(data);
      }
      return this.pollPreviewStatus(data.previewId, signal, onProgress);
    }

    return data;
  },

  async getPreviewStatus(
    previewId: string,
    signal?: AbortSignal,
  ): Promise<StudioPreviewResponse> {
    const res = await api.get<any>(`/media/preview/${previewId}/status`, { signal });
    return res.data?.data || res.data;
  },

  async pollPreviewStatus(
    previewId: string,
    signal?: AbortSignal,
    onProgress?: (state: StudioPreviewResponse) => void
  ): Promise<StudioPreviewResponse> {
    const startTime = Date.now();
    const timeoutMs = 300000; // 5 minutos de timeout
    const intervalMs = 1200; // intervalo de polling entre 1 e 1.5s

    while (Date.now() - startTime < timeoutMs) {
      if (signal?.aborted) {
        throw new Error('Operação cancelada pelo usuário.');
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }, intervalMs);
        const onAbort = () => {
          clearTimeout(timer);
          resolve();
        };
        signal?.addEventListener('abort', onAbort, { once: true });
      });

      if (signal?.aborted) {
        throw new Error('Operação cancelada pelo usuário.');
      }

      try {
        const state = await this.getPreviewStatus(previewId, signal);
        if (onProgress) {
          onProgress(state);
        }

        if (state.status === 'COMPLETED') {
          return state;
        }
        if (state.status === 'FAILED') {
          throw new Error(state.error || 'Falha durante o processamento do preview.');
        }
      } catch (err: any) {
        if (signal?.aborted) throw err;
        if (err?.response?.status === 404) {
          // Continua aguardando caso o worker ainda esteja registrando o preview no Redis
          continue;
        }
        throw err;
      }
    }

    throw new Error('Tempo limite excedido ao aguardar o processamento do preview.');
  },

  async deleteStudioPreview(previewId: string): Promise<{ success: boolean }> {
    const res = await api.delete<{ success: boolean }>(`/media/preview/${previewId}`);
    return res.data;
  },

  async clearPreviews(previewIds?: string[]): Promise<{ success: boolean; cleared: number }> {
    const res = await api.delete<{ success: boolean; cleared: number }>('/media/previews', {
      data: previewIds && previewIds.length > 0 ? { previewIds } : {},
    });
    return res.data;
  },

  async downloadJobFile(jobId: string, title?: string | null): Promise<void> {
    try {
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
    } catch (err: any) {
      // Se a resposta for um Blob contendo JSON de erro (ex: 400 Bad Request - Vídeo Expirado)
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) {
            err.message = Array.isArray(json.message) ? json.message[0] : json.message;
            err.response.data = json;
          }
        } catch {}
      }
      throw err;
    }
  },

  async getGeminiStatus(): Promise<{ connected: boolean }> {
    const res = await api.get<any>('/gemini/status');
    return res.data?.data || res.data;
  },

  async transcribeVideoAudio(params: {
    file?: File | null;
    previewId?: string;
    sourceUrl?: string;
    trimStart?: number;
    trimEnd?: number;
    language?: string;
  }): Promise<GeminiSubtitlesResponse> {
    if (params.file) {
      const formData = new FormData();
      formData.append('file', params.file);
      if (params.language) formData.append('language', params.language);
      if (params.previewId) formData.append('previewId', params.previewId);
      if (params.sourceUrl) formData.append('sourceUrl', params.sourceUrl);
      if (typeof params.trimStart === 'number') formData.append('trimStart', String(params.trimStart));
      if (typeof params.trimEnd === 'number') formData.append('trimEnd', String(params.trimEnd));

      const res = await api.post<any>('/gemini/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data?.data || res.data;
    }

    const res = await api.post<any>('/gemini/transcribe', {
      language: params.language,
      previewId: params.previewId,
      sourceUrl: params.sourceUrl,
      trimStart: params.trimStart,
      trimEnd: params.trimEnd,
    });
    return res.data?.data || res.data;
  },
};
