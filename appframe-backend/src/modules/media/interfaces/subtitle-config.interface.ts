export type SubtitleMode = 'static' | 'dynamic';

export interface SubtitleConfig {
  text?: string;
  mode: SubtitleMode;
  font_family?: string;
  font_size?: number;
  text_color?: string;
  background_color?: string;
  stroke_color?: string;
  use_background_box?: boolean;
  position?: 'top' | 'center' | 'bottom' | string;
}
