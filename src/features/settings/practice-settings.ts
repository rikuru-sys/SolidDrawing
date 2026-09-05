import type { Difficulty, LightDirection, ShapeName } from '../../domain/prompt/types';
import type { Stabilization } from '../drawing/types';

export type Layout = 'top' | 'bottom' | 'left' | 'right';
export type SampleStyle = 'shaded' | 'shadow' | 'hidden-lines';
export type SampleVisibility = 'always' | 'partway';
export type PracticeMode = 'canvas' | 'sample-only';

export type Settings = {
  shapes: ShapeName[];
  time: number | null;
  count: number;
  layout: Layout;
  penWidth: number;
  penColor: string;
  penOpacity: number;
  sampleStyle: SampleStyle;
  lightDirections: LightDirection[];
  difficulty: Difficulty;
  sampleVisibility: SampleVisibility;
  practiceMode: PracticeMode;
  stabilization: Stabilization;
};

export const ALL_SHAPES: ShapeName[] = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'];
export const TIME_CHOICES: Array<number | null> = [10, 15, 20, 30, 40, 45, 50, 60, null];
export const ALL_LIGHT_DIRECTIONS: LightDirection[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

export const DEFAULT_SETTINGS: Settings = {
  shapes: [...ALL_SHAPES],
  time: 30,
  count: 10,
  layout: 'left',
  penWidth: 3,
  penColor: '#30322c',
  penOpacity: 1,
  sampleStyle: 'shaded',
  lightDirections: [...ALL_LIGHT_DIRECTIONS],
  difficulty: 'easy',
  sampleVisibility: 'always',
  practiceMode: 'canvas',
  stabilization: 'low',
};

export function freshDefaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    shapes: [...ALL_SHAPES],
    lightDirections: [...ALL_LIGHT_DIRECTIONS],
  };
}

export function updateSettings(settings: Settings, patch: Partial<Settings>): Settings {
  return { ...settings, ...patch };
}

export function toggleShapeSelection(settings: Settings, shape: ShapeName): Settings {
  return updateSettings(settings, {
    shapes: settings.shapes.includes(shape)
      ? settings.shapes.filter((item) => item !== shape)
      : [...settings.shapes, shape],
  });
}

export function toggleLightDirectionSelection(
  settings: Settings,
  direction: LightDirection,
): Settings {
  return updateSettings(settings, {
    lightDirections: settings.lightDirections.includes(direction)
      ? settings.lightDirections.filter((item) => item !== direction)
      : [...settings.lightDirections, direction],
  });
}
