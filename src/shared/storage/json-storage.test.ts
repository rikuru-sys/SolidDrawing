import { describe, expect, it } from 'vitest';
import {
  readJsonStorage,
  writeJsonStorage,
  type JsonStorage,
} from './json-storage';

class MemoryStorage implements JsonStorage {
  values = new Map<string, string>();
  removed: string[] = [];
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); this.removed.push(key); }
}

describe('json storage', () => {
  it('JSON値を保存して変換しながら読み込む', () => {
    const storage = new MemoryStorage();
    expect(writeJsonStorage(storage, 'key', { count: 2 })).toBe(true);
    expect(readJsonStorage({ storage, key: 'key', fallback: () => 0, parse: (value) => (value as { count: number }).count })).toBe(2);
  });

  it('壊れたJSONを削除して既定値へ戻す', () => {
    const storage = new MemoryStorage();
    storage.values.set('key', '{broken');
    expect(readJsonStorage({ storage, key: 'key', fallback: () => [], parse: (value) => value as [] })).toEqual([]);
    expect(storage.removed).toEqual(['key']);
  });

  it('利用できない保存先でも例外を外へ出さない', () => {
    expect(readJsonStorage({ storage: null, key: 'key', fallback: () => 'default', parse: String })).toBe('default');
    expect(writeJsonStorage(null, 'key', {})).toBe(false);
  });
});
