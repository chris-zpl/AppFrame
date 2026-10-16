import type { FontFamily, WatermarkPosition } from '../interfaces';

export const FONT_FAMILIES: FontFamily[] = [
  'Plus Jakarta Sans',
  'Montserrat',
  'Bebas Neue',
  'Anton',
];

export const WATERMARK_POSITIONS: WatermarkPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export interface MatrixPositionItem {
  key: WatermarkPosition;
  label: string;
  icon: string;
}

export const MATRIX_POSITIONS: MatrixPositionItem[] = [
  { key: 'top-left', label: 'Superior Esquerdo', icon: 'north_west' },
  { key: 'top-center', label: 'Superior Centro', icon: 'north' },
  { key: 'top-right', label: 'Superior Direito', icon: 'north_east' },
  { key: 'center-left', label: 'Centro Esquerdo', icon: 'west' },
  { key: 'center', label: 'Centro', icon: 'filter_center_focus' },
  { key: 'center-right', label: 'Centro Direito', icon: 'east' },
  { key: 'bottom-left', label: 'Inferior Esquerdo', icon: 'south_west' },
  { key: 'bottom-center', label: 'Inferior Centro', icon: 'south' },
  { key: 'bottom-right', label: 'Inferior Direito', icon: 'south_east' },
];
