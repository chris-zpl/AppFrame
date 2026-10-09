export type SubtitleMode = 'static' | 'dynamic';

export interface SubtitleConfig {
  text?: string;
  mode: SubtitleMode;
  font_family?: string;
  text_color?: string;
  background_color?: string;
  position?: 'top' | 'center' | 'bottom' | string;
}
