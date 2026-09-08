import { describe, expect, it } from 'vitest';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { JsonStorage } from '../../shared/storage/json-storage';
import {
  FAVORITES_SCHEMA_VERSION,
  FAVORITES_STORAGE_KEY,
  MAX_STORED_FAVORITES,
  parseStoredPrompt,
  readStoredFavorites,
  saveStoredFavorites,
} from './favorite-storage';
import type { Favorite } from './types';

class MemoryStorage implements JsonStorage {
  values = new Map<string, string>();
  removedKeys: string[] = [];

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); this.removedKeys.push(key); }
}

function prompt(index = 0, overrides: Partial<ShapePrompt> = {}): ShapePrompt {
  return {
    id: `prompt-${index}`,
    shape: '立方体',
    widthScale: 1,
    heightScale: 1.1,
    depthScale: 0.9,
    cameraAzimuth: 0.4,
    cameraElevation: 0.3,
    objectRotationX: 0.1,
    objectRotationY: 0.2 + index * 0.01,
    objectRotationZ: 0.3,
    lightDirection: 'top-left',
    generation: { seed: 12345, version: 1, index },
    ...overrides,
  };
}

function favorite(index = 0, overrides: Partial<ShapePrompt> = {}): Favorite {
  return { prompt: prompt(index, overrides) };
}

describe('favorite storage', () => {
  it('向き・比率・光源を含む立体情報だけを形式バージョン付きで保存・復元する', () => {
    const storage = new MemoryStorage();
    const favorites = [favorite(0), favorite(1, { lightDirection: 'bottom-right' })];

    expect(saveStoredFavorites(favorites, storage)).toBe(true);
    expect(readStoredFavorites(storage)).toEqual(favorites);
    expect(JSON.parse(storage.values.get(FAVORITES_STORAGE_KEY) ?? '{}')).toEqual({
      schemaVersion: FAVORITES_SCHEMA_VERSION,
      items: favorites,
    });
  });

  it('旧形式は読み込まない', () => {
    const storage = new MemoryStorage();
    storage.values.set(FAVORITES_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      items: [{ sample: { prompt: prompt() } }],
    }));

    expect(readStoredFavorites(storage)).toEqual([]);
  });

  it('未対応の立体と不完全な数値を含む立体情報を除外する', () => {
    expect(parseStoredPrompt({ ...prompt(), shape: '球' })).toBeNull();
    expect(parseStoredPrompt({ ...prompt(), cameraAzimuth: Number.NaN })).toBeNull();
    expect(parseStoredPrompt({ shape: '立方体' })).toBeNull();
  });

  it('出題IDだけが異なる同じ立体を重複保存しない', () => {
    const storage = new MemoryStorage();
    const original = favorite();
    const duplicate = favorite(0, { id: 'different-id' });
    storage.values.set(FAVORITES_STORAGE_KEY, JSON.stringify({
      schemaVersion: FAVORITES_SCHEMA_VERSION,
      items: [original, duplicate],
    }));

    expect(readStoredFavorites(storage)).toEqual([original]);
  });

  it('壊れたデータを削除して空の一覧へ戻す', () => {
    const storage = new MemoryStorage();
    storage.values.set(FAVORITES_STORAGE_KEY, '{broken-json');

    expect(readStoredFavorites(storage)).toEqual([]);
    expect(storage.removedKeys).toEqual([FAVORITES_STORAGE_KEY]);
  });

  it('保存・復元する件数を上限までに制限する', () => {
    const storage = new MemoryStorage();
    const favorites = Array.from(
      { length: MAX_STORED_FAVORITES + 5 },
      (_, index) => favorite(index),
    );

    saveStoredFavorites(favorites, storage);
    expect(readStoredFavorites(storage)).toHaveLength(MAX_STORED_FAVORITES);
  });

  it('保存に失敗しても処理を継続する', () => {
    const storage: JsonStorage = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => { throw new Error('storage unavailable'); },
    };

    expect(saveStoredFavorites([favorite()], storage)).toBe(false);
  });
});
