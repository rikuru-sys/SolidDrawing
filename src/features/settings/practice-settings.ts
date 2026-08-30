import type { Difficulty, LightDirection, ShapeName } from '../../domain/prompt/types';
import { clampSeed, type SeedMode } from '../../domain/random/seeded-random';
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
  seedMode: SeedMode;
  fixedSeed: number;
};

export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const SETTINGS_STORAGE_KEY = 'solid-drawing-settings';
export const ALL_SHAPES: ShapeName[] = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'];
export const TIME_CHOICES: Array<number | null> = [10, 15, 20, 30, 40, 45, 50, 60, null];
export const ALL_LIGHT_DIRECTIONS: LightDirection[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
];

const LAYOUTS: Layout[] = ['top', 'bottom', 'left', 'right'];
const PEN_WIDTHS = [2, 3, 5];

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
  seedMode: 'random',
  fixedSeed: 123456789,
};

export function freshDefaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    shapes: [...ALL_SHAPES],
    lightDirections: [...ALL_LIGHT_DIRECTIONS],
  };
}

export function normalizeStoredSettings(parsed: Record<string, unknown>): Settings {
  const shapes = Array.isArray(parsed.shapes)
    ? parsed.shapes.filter((shape): shape is ShapeName => ALL_SHAPES.includes(shape as ShapeName))
    : [];
  const lightDirections = Array.isArray(parsed.lightDirections)
    ? parsed.lightDirections.filter((direction): direction is LightDirection => (
      ALL_LIGHT_DIRECTIONS.includes(direction as LightDirection)
    ))
    : [];
  const time = parsed.time === null
    || (typeof parsed.time === 'number' && TIME_CHOICES.includes(parsed.time))
    ? parsed.time as number | null
    : DEFAULT_SETTINGS.time;
  const count = typeof parsed.count === 'number' && Number.isFinite(parsed.count)
    ? Math.max(1, Math.min(20, Math.round(parsed.count)))
    : DEFAULT_SETTINGS.count;
  const layout = typeof parsed.layout === 'string' && LAYOUTS.includes(parsed.layout as Layout)
    ? parsed.layout as Layout
    : DEFAULT_SETTINGS.layout;
  const penWidth = typeof parsed.penWidth === 'number' && PEN_WIDTHS.includes(parsed.penWidth)
    ? parsed.penWidth
    : DEFAULT_SETTINGS.penWidth;
  const penColor = typeof parsed.penColor === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.penColor)
    ? parsed.penColor
    : DEFAULT_SETTINGS.penColor;
  const penOpacity = typeof parsed.penOpacity === 'number' && Number.isFinite(parsed.penOpacity)
    ? Math.max(0.1, Math.min(1, parsed.penOpacity))
    : DEFAULT_SETTINGS.penOpacity;
  const sampleStyle = parsed.sampleStyle === 'shadow' || parsed.sampleStyle === 'hidden-lines'
    ? parsed.sampleStyle
    : 'shaded';
  const fixedSeed = typeof parsed.fixedSeed === 'number' && Number.isFinite(parsed.fixedSeed)
    ? clampSeed(parsed.fixedSeed)
    : DEFAULT_SETTINGS.fixedSeed;

  return {
    shapes: shapes.length ? shapes : [...ALL_SHAPES],
    time,
    count,
    layout,
    penWidth,
    penColor,
    penOpacity,
    sampleStyle,
    lightDirections: lightDirections.length ? lightDirections : [...ALL_LIGHT_DIRECTIONS],
    difficulty: parsed.difficulty === 'hard' ? 'hard' : 'easy',
    sampleVisibility: parsed.sampleVisibility === 'partway' ? 'partway' : 'always',
    practiceMode: parsed.practiceMode === 'sample-only' ? 'sample-only' : 'canvas',
    stabilization: parsed.stabilization === 'off' || parsed.stabilization === 'medium'
      ? parsed.stabilization
      : 'low',
    seedMode: parsed.seedMode === 'fixed' ? 'fixed' : 'random',
    fixedSeed,
  };
}

function browserSettingsStorage(): SettingsStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredSettings(
  storage: SettingsStorage | null = browserSettingsStorage(),
): Settings {
  if (!storage) return freshDefaultSettings();
  try {
    const saved = storage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return freshDefaultSettings();
    return normalizeStoredSettings(JSON.parse(saved) as Record<string, unknown>);
  } catch {
    try {
      storage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {
      // Storage may be unavailable in privacy-restricted browsing modes.
    }
    return freshDefaultSettings();
  }
}

export function saveStoredSettings(
  settings: Settings,
  storage: SettingsStorage | null = browserSettingsStorage(),
) {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
