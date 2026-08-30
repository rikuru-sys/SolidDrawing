import type {
  LightDirection,
  PromptGeneration,
  ShapeName,
  ShapePrompt,
} from '../../domain/prompt/types';
import {
  ALL_LIGHT_DIRECTIONS,
  ALL_SHAPES,
  normalizeStoredSettings,
  type SettingsStorage,
} from '../settings/practice-settings';
import type { Favorite } from './types';

export const FAVORITES_STORAGE_KEY = 'solid-drawing-favorites';
export const MAX_STORED_FAVORITES = 100;

export function parseStoredPrompt(value: unknown): ShapePrompt | null {
  if (!value || typeof value !== 'object') return null;
  const prompt = value as Record<string, unknown>;
  const numericKeys = [
    'widthScale',
    'heightScale',
    'depthScale',
    'cameraAzimuth',
    'cameraElevation',
    'objectRotationX',
    'objectRotationY',
    'objectRotationZ',
  ] as const;
  if (typeof prompt.id !== 'string'
    || typeof prompt.shape !== 'string'
    || !ALL_SHAPES.includes(prompt.shape as ShapeName)
    || typeof prompt.lightDirection !== 'string'
    || !ALL_LIGHT_DIRECTIONS.includes(prompt.lightDirection as LightDirection)
    || !numericKeys.every((key) => typeof prompt[key] === 'number' && Number.isFinite(prompt[key]))) {
    return null;
  }
  const storedGeneration = prompt.generation;
  const generation: PromptGeneration | undefined = storedGeneration
    && typeof storedGeneration === 'object'
    && typeof (storedGeneration as Record<string, unknown>).seed === 'number'
    && Number.isFinite((storedGeneration as Record<string, unknown>).seed)
    && (storedGeneration as Record<string, unknown>).version === 1
    && typeof (storedGeneration as Record<string, unknown>).index === 'number'
    && Number.isInteger((storedGeneration as Record<string, unknown>).index)
    ? {
      seed: ((storedGeneration as Record<string, unknown>).seed as number) >>> 0,
      version: 1,
      index: (storedGeneration as Record<string, unknown>).index as number,
    }
    : undefined;

  return {
    id: prompt.id,
    shape: prompt.shape as ShapeName,
    widthScale: prompt.widthScale as number,
    heightScale: prompt.heightScale as number,
    depthScale: prompt.depthScale as number,
    cameraAzimuth: prompt.cameraAzimuth as number,
    cameraElevation: prompt.cameraElevation as number,
    objectRotationX: prompt.objectRotationX as number,
    objectRotationY: prompt.objectRotationY as number,
    objectRotationZ: prompt.objectRotationZ as number,
    lightDirection: prompt.lightDirection as LightDirection,
    ...(generation ? { generation } : {}),
  };
}

function browserFavoritesStorage(): SettingsStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readStoredFavorites(
  storage: SettingsStorage | null = browserFavoritesStorage(),
): Favorite[] {
  if (!storage) return [];
  try {
    const saved = storage.getItem(FAVORITES_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): Favorite[] => {
      if (!value || typeof value !== 'object') return [];
      const item = value as Record<string, unknown>;
      const prompt = parseStoredPrompt(item.prompt);
      if (!prompt || !item.settings || typeof item.settings !== 'object') return [];
      return [{
        id: typeof item.id === 'string' ? item.id : `favorite-${prompt.id}`,
        prompt,
        settings: normalizeStoredSettings(item.settings as Record<string, unknown>),
        createdAt: typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
          ? item.createdAt
          : Date.now(),
      }];
    }).slice(0, MAX_STORED_FAVORITES);
  } catch {
    try {
      storage.removeItem(FAVORITES_STORAGE_KEY);
    } catch {
      // Storage may be unavailable in privacy-restricted browsing modes.
    }
    return [];
  }
}

export function saveStoredFavorites(
  favorites: Favorite[],
  storage: SettingsStorage | null = browserFavoritesStorage(),
) {
  if (!storage) return false;
  try {
    storage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(favorites.slice(0, MAX_STORED_FAVORITES)),
    );
    return true;
  } catch {
    return false;
  }
}
