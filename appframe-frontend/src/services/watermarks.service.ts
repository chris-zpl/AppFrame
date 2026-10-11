import api, { API_BASE_URL } from './api';

export interface WatermarkItem {
  id: string;
  user_id: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  url?: string;
}

export const watermarksService = {
  async list(): Promise<WatermarkItem[]> {
    const res = await api.get<WatermarkItem[]>('/watermarks');
    return res.data.map((item) => ({
      ...item,
      url: item.url ? (item.url.startsWith('http') ? item.url : `${API_BASE_URL.replace(/\/api\/v1$/, '')}${item.url}`) : `${API_BASE_URL}/watermarks/${item.id}/file`,
    }));
  },

  async upload(file: File): Promise<WatermarkItem> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<WatermarkItem>('/watermarks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    const item = res.data;
    return {
      ...item,
      url: item.url ? (item.url.startsWith('http') ? item.url : `${API_BASE_URL.replace(/\/api\/v1$/, '')}${item.url}`) : `${API_BASE_URL}/watermarks/${item.id}/file`,
    };
  },

  async delete(id: string): Promise<{ deleted: boolean }> {
    const res = await api.delete<{ deleted: boolean }>(`/watermarks/${id}`);
    return res.data;
  },

  async getById(id: string): Promise<WatermarkItem> {
    const res = await api.get<WatermarkItem>(`/watermarks/${id}`);
    const item = res.data;
    return {
      ...item,
      url: item.url ? (item.url.startsWith('http') ? item.url : `${API_BASE_URL.replace(/\/api\/v1$/, '')}${item.url}`) : `${API_BASE_URL}/watermarks/${item.id}/file`,
    };
  },

  getFileUrl(id: string): string {
    return `${API_BASE_URL}/watermarks/${id}/file`;
  },
};
