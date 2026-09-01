import type { LightDirection, ShapeName } from '../../domain/prompt/types';
import { clampSeed } from '../../domain/random/seeded-random';
import {
  browserLocalStorage,
  readJsonStorage,
  writeJsonStorage,
  type JsonStorage,
} from '../../shared/storage/json-storage';
import {
  ALL_LIGHT_DIRECTIONS,
  ALL_SHAPES,
  DEFAULT_SETTINGS,
  freshDefaultSettings,
  TIME_CHOICES,
  type Layout,
  type Settings,
} from './practice-settings';

export type SettingsStorage = JsonStorage;

export const SETTINGS_STORAGE_KEY = 'solid-drawing-settings';

const LAYOUTS: Layout[] = ['top', 'bottom', 'left', 'right'];
const PEN_WIDTHS = [2, 3, 5];

/** 保存済みの不明な値を、現在利用できる設定へ補正する。 */
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

/** 端末に保存された設定を読み込み、利用できない場合は既定値を返す。 */
export function readStoredSettings(
  storage: SettingsStorage | null = browserLocalStorage(),
): Settings {
  return readJsonStorage({
    storage,
    key: SETTINGS_STORAGE_KEY,
    fallback: freshDefaultSettings,
    parse: (value) => normalizeStoredSettings(value as Record<string, unknown>),
  });
}

/** 設定を端末へ保存する。保存できなかった場合はfalseを返す。 */
export function saveStoredSettings(
  settings: Settings,
  storage: SettingsStorage | null = browserLocalStorage(),
) {
  return writeJsonStorage(storage, SETTINGS_STORAGE_KEY, settings);
}
