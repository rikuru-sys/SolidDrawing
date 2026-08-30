import type { LightDirection } from '../../domain/prompt/types';
import type { Layout } from './practice-settings';

export const LAYOUT_OPTIONS: Array<{ value: Layout; label: string }> = [
  { value: 'top', label: '見本が上' },
  { value: 'bottom', label: '見本が下' },
  { value: 'left', label: '見本が左' },
  { value: 'right', label: '見本が右' },
];

export const LIGHT_DIRECTION_OPTIONS: Array<{
  value: LightDirection;
  label: string;
  arrow: string;
}> = [
  { value: 'top-left', label: '左上', arrow: '↘' },
  { value: 'top-right', label: '右上', arrow: '↙' },
  { value: 'bottom-left', label: '左下', arrow: '↗' },
  { value: 'bottom-right', label: '右下', arrow: '↖' },
];
