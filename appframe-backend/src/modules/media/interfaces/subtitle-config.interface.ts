export type SubtitleMode = 'static' | 'dynamic';

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

export interface SubtitleConfig {
  text?: string;
  mode: SubtitleMode;
  lines?: SubtitleLineData[];
  segments?: SubtitleSegmentData[];
  overlay_image?: string;
  font_family?: string;
  font_size?: number;
  text_color?: string;
  background_color?: string;
  stroke_color?: string;
  use_background_box?: boolean;
  position?: 'top' | 'center' | 'bottom' | string;
}

