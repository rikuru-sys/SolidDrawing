import type {
  LightDirection,
  PromptGeneration,
  ShapeName,
  ShapePrompt,
} from '../../domain/prompt/types';
import {
  browserLocalStorage,
  readJsonStorage,
  writeJsonStorage,
  type JsonStorage,
} from '../../shared/storage/json-storage';
import {
  ALL_LIGHT_DIRECTIONS,
  ALL_SHAPES,
} from '../settings/practice-settings';
import { createPromptIdentity } from './prompt-identity';
import type { Favorite } from './types';

export const FAVORITES_STORAGE_KEY = 'solid-drawing-favorites';
export const MAX_STORED_FAVORITES = 100;
export const FAVORITES_SCHEMA_VERSION = 3 as const;

type StoredFavorites = {
  schemaVersion: typeof FAVORITES_SCHEMA_VERSION;
  items: Favorite[];
};

function storedFavoriteItems(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const record = parsed as Record<string, unknown>;
  return record.schemaVersion === FAVORITES_SCHEMA_VERSION && Array.isArray(record.items)
    ? record.items
    : [];
}

function parseGeneration(value: unknown): PromptGeneration | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const generation = value as Record<string, unknown>;
  if (typeof generation.seed !== 'number'
    || !Number.isFinite(generation.seed)
    || generation.version !== 1
    || typeof generation.index !== 'number'
    || !Number.isInteger(generation.index)) {
    return undefined;
  }
  return {
    seed: generation.seed >>> 0,
    version: 1,
    index: generation.index,
  };
}

/** LocalStorageから読み込んだ値を、安全に利用できる立体情報へ変換する。 */
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
    || !numericKeys.every((key) => (
      typeof prompt[key] === 'number' && Number.isFinite(prompt[key])
    ))) {
    return null;
  }

  const generation = parseGeneration(prompt.generation);
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

export function readStoredFavorites(
  storage: JsonStorage | null = browserLocalStorage(),
) {
  return readJsonStorage<Favorite[]>({
    storage,
    key: FAVORITES_STORAGE_KEY,
    fallback: () => [],
    parse: (parsed) => {
      const identities = new Set<string>();
      return storedFavoriteItems(parsed).flatMap((value): Favorite[] => {
        if (!value || typeof value !== 'object') return [];
        const prompt = parseStoredPrompt((value as Record<string, unknown>).prompt);
        if (!prompt) return [];

        const identity = createPromptIdentity(prompt);
        if (identities.has(identity)) return [];
        identities.add(identity);
        return [{ prompt }];
      }).slice(0, MAX_STORED_FAVORITES);
    },
  });
}

export function saveStoredFavorites(
  favorites: Favorite[],
  storage: JsonStorage | null = browserLocalStorage(),
) {
  const payload: StoredFavorites = {
    schemaVersion: FAVORITES_SCHEMA_VERSION,
    items: favorites.slice(0, MAX_STORED_FAVORITES),
  };
  return writeJsonStorage(storage, FAVORITES_STORAGE_KEY, payload);
}
