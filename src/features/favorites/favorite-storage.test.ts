import { describe, expect, it } from 'vitest';
import { freshDefaultSettings, type SettingsStorage } from '../settings/practice-settings';
import {
  FAVORITES_STORAGE_KEY,
  MAX_STORED_FAVORITES,
  parseStoredPrompt,
  readStoredFavorites,
  saveStoredFavorites,
} from './favorite-storage';
import type { Favorite } from './types';

class MemoryStorage implements SettingsStorage {
  values = new Map<string, string>();
  removedKeys: string[] = [];

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); this.removedKeys.push(key); }
}

function favorite(index = 0): Favorite {
  return {
    id: `favorite-${index}`,
    prompt: {
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
    },
    settings: freshDefaultSettings(),
    createdAt: 1_788_019_200_000 + index,
  };
}

describe('favorite storage', () => {
  it('saves and restores favorites with prompts and settings', () => {
    const storage = new MemoryStorage();
    const favorites = [favorite(0), favorite(1)];

    expect(saveStoredFavorites(favorites, storage)).toBe(true);
    expect(readStoredFavorites(storage)).toEqual(favorites);
  });

  it('rejects unsupported shapes and incomplete prompt numbers', () => {
    expect(parseStoredPrompt({ ...favorite().prompt, shape: '球' })).toBeNull();
    expect(parseStoredPrompt({ ...favorite().prompt, cameraAzimuth: Number.NaN })).toBeNull();
  });

  it('normalizes older settings and creates a fallback id', () => {
    const storage = new MemoryStorage();
    storage.values.set(FAVORITES_STORAGE_KEY, JSON.stringify([{
      prompt: favorite().prompt,
      settings: { time: 45, count: 4 },
      createdAt: 100,
    }]));

    const [restored] = readStoredFavorites(storage);
    expect(restored.id).toBe('favorite-prompt-0');
    expect(restored.settings.time).toBe(45);
    expect(restored.settings.count).toBe(4);
    expect(restored.settings.shapes.length).toBeGreaterThan(0);
  });

  it('removes malformed data and falls back to an empty list', () => {
    const storage = new MemoryStorage();
    storage.values.set(FAVORITES_STORAGE_KEY, '{broken-json');

    expect(readStoredFavorites(storage)).toEqual([]);
    expect(storage.removedKeys).toEqual([FAVORITES_STORAGE_KEY]);
  });

  it('limits stored and restored favorites to the supported maximum', () => {
    const storage = new MemoryStorage();
    const favorites = Array.from({ length: MAX_STORED_FAVORITES + 5 }, (_, index) => favorite(index));

    saveStoredFavorites(favorites, storage);
    expect(readStoredFavorites(storage)).toHaveLength(MAX_STORED_FAVORITES);
  });

  it('continues in memory when writes fail', () => {
    const storage: SettingsStorage = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => { throw new Error('storage unavailable'); },
    };

    expect(saveStoredFavorites([favorite()], storage)).toBe(false);
  });
});
