import { describe, expect, it } from 'vitest';
import type { JsonStorage } from '../../shared/storage/json-storage';
import { freshDefaultSettings } from '../settings/practice-settings';
import {
  FAVORITES_SCHEMA_VERSION,
  FAVORITES_STORAGE_KEY,
  MAX_STORED_FAVORITES,
  parseStoredPrompt,
  readStoredFavorites,
  saveStoredFavorites,
} from './favorite-storage';
import { createPromptIdentity } from './prompt-identity';
import { FAVORITE_SNAPSHOT_VERSION, type Favorite } from './types';

class MemoryStorage implements JsonStorage {
  values = new Map<string, string>();
  removedKeys: string[] = [];

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); this.removedKeys.push(key); }
}

function favorite(index = 0): Favorite {
  const prompt: Favorite['sample']['prompt'] = {
    id: `prompt-${index}`,
    shape: '立方体',
    widthScale: 1,
    heightScale: 1,
    depthScale: 1,
    cameraAzimuth: 0.4,
    cameraElevation: 0.3,
    objectRotationX: 0,
    objectRotationY: 0,
    objectRotationZ: 0,
    lightDirection: 'top-left',
    generation: { seed: 12345, version: 1, index },
  };
  return {
    id: `favorite-${index}`,
    snapshotVersion: FAVORITE_SNAPSHOT_VERSION,
    sample: {
      promptKey: createPromptIdentity(prompt),
      prompt,
    },
    savedPractice: { settings: freshDefaultSettings() },
    createdWithAppVersion: '2026.09.05.1',
    createdAt: 1_788_019_200_000 + index,
  };
}

describe('favorite storage', () => {
  it('見本と保存時設定を分け、形式バージョン付きで保存・復元する', () => {
    const storage = new MemoryStorage();
    const favorites = [favorite(0), favorite(1)];

    expect(saveStoredFavorites(favorites, storage)).toBe(true);
    expect(readStoredFavorites(storage)).toEqual(favorites);
    expect(JSON.parse(storage.values.get(FAVORITES_STORAGE_KEY) ?? '{}')).toMatchObject({
      schemaVersion: FAVORITES_SCHEMA_VERSION,
      items: favorites,
    });
    expect(favorites[0]).toMatchObject({
      snapshotVersion: FAVORITE_SNAPSHOT_VERSION,
      sample: { prompt: favorites[0].sample.prompt },
      savedPractice: { settings: freshDefaultSettings() },
    });
  });

  it('rejects unsupported shapes and incomplete prompt numbers', () => {
    expect(parseStoredPrompt({ ...favorite().sample.prompt, shape: '球' })).toBeNull();
    expect(parseStoredPrompt({ ...favorite().sample.prompt, cameraAzimuth: Number.NaN })).toBeNull();
  });

  it('旧形式を新しいスナップショット形式へ移行する', () => {
    const storage = new MemoryStorage();
    storage.values.set(FAVORITES_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      items: [{
        prompt: favorite().sample.prompt,
        settings: { time: 45, count: 4 },
        createdAt: 100,
      }],
    }));

    const [restored] = readStoredFavorites(storage);
    expect(restored.id).toBe('favorite-prompt-0');
    expect(restored.snapshotVersion).toBe(FAVORITE_SNAPSHOT_VERSION);
    expect(restored.createdWithAppVersion).toBe('unknown');
    expect(restored.sample.promptKey).toBe(createPromptIdentity(favorite().sample.prompt));
    expect(restored.savedPractice.settings.time).toBe(45);
    expect(restored.savedPractice.settings.count).toBe(4);
    expect(restored.savedPractice.settings.shapes.length).toBeGreaterThan(0);
  });

  it('removes malformed data and falls back to an empty list', () => {
    const storage = new MemoryStorage();
    storage.values.set(FAVORITES_STORAGE_KEY, '{broken-json');

    expect(readStoredFavorites(storage)).toEqual([]);
    expect(storage.removedKeys).toEqual([FAVORITES_STORAGE_KEY]);
  });

  it('未対応のスナップショット形式は読み込まない', () => {
    const storage = new MemoryStorage();
    storage.values.set(FAVORITES_STORAGE_KEY, JSON.stringify({
      schemaVersion: FAVORITES_SCHEMA_VERSION,
      items: [{ ...favorite(), snapshotVersion: 999 }],
    }));

    expect(readStoredFavorites(storage)).toEqual([]);
  });

  it('limits stored and restored favorites to the supported maximum', () => {
    const storage = new MemoryStorage();
    const favorites = Array.from({ length: MAX_STORED_FAVORITES + 5 }, (_, index) => favorite(index));

    saveStoredFavorites(favorites, storage);
    expect(readStoredFavorites(storage)).toHaveLength(MAX_STORED_FAVORITES);
  });

  it('continues in memory when writes fail', () => {
    const storage: JsonStorage = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => { throw new Error('storage unavailable'); },
    };

    expect(saveStoredFavorites([favorite()], storage)).toBe(false);
  });
});
