import { describe, expect, it } from 'vitest';
import {
  ALL_LIGHT_DIRECTIONS,
  ALL_SHAPES,
  DEFAULT_SETTINGS,
  freshDefaultSettings,
  normalizeStoredSettings,
  readStoredSettings,
  saveStoredSettings,
  SETTINGS_STORAGE_KEY,
  type Settings,
  type SettingsStorage,
} from './practice-settings';

class MemoryStorage implements SettingsStorage {
  values = new Map<string, string>();
  removedKeys: string[] = [];

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
    this.removedKeys.push(key);
  }
}

describe('practice settings storage', () => {
  it('returns independent default arrays when there is no saved value', () => {
    const first = freshDefaultSettings();
    const second = readStoredSettings(new MemoryStorage());

    first.shapes.pop();
    first.lightDirections.pop();

    expect(second.shapes).toEqual(ALL_SHAPES);
    expect(second.lightDirections).toEqual(ALL_LIGHT_DIRECTIONS);
    expect(second).toMatchObject(DEFAULT_SETTINGS);
  });

  it('saves and restores all supported settings', () => {
    const storage = new MemoryStorage();
    const settings: Settings = {
      ...freshDefaultSettings(),
      shapes: ['三角錐'],
      time: 45,
      count: 20,
      layout: 'bottom',
      penWidth: 5,
      penColor: '#A1b2C3',
      penOpacity: 0.45,
      sampleStyle: 'shadow',
      lightDirections: ['bottom-right'],
      difficulty: 'hard',
      sampleVisibility: 'partway',
      practiceMode: 'sample-only',
      stabilization: 'medium',
      seedMode: 'fixed',
      fixedSeed: 987654321,
    };

    expect(saveStoredSettings(settings, storage)).toBe(true);
    expect(readStoredSettings(storage)).toEqual(settings);
  });

  it('normalizes invalid and out-of-range saved values', () => {
    const normalized = normalizeStoredSettings({
      shapes: ['立方体', '球'],
      time: 25,
      count: 99.7,
      layout: 'diagonal',
      penWidth: 99,
      penColor: 'black',
      penOpacity: 0,
      lightDirections: ['top-left', 'center'],
      fixedSeed: -50,
    });

    expect(normalized.shapes).toEqual(['立方体']);
    expect(normalized.time).toBe(DEFAULT_SETTINGS.time);
    expect(normalized.count).toBe(20);
    expect(normalized.layout).toBe(DEFAULT_SETTINGS.layout);
    expect(normalized.penWidth).toBe(DEFAULT_SETTINGS.penWidth);
    expect(normalized.penColor).toBe(DEFAULT_SETTINGS.penColor);
    expect(normalized.penOpacity).toBe(0.1);
    expect(normalized.lightDirections).toEqual(['top-left']);
    expect(normalized.fixedSeed).toBe(0);
  });

  it('accepts the 15 and 45 second choices', () => {
    expect(normalizeStoredSettings({ time: 15 }).time).toBe(15);
    expect(normalizeStoredSettings({ time: 45 }).time).toBe(45);
  });

  it('removes malformed JSON and falls back to defaults', () => {
    const storage = new MemoryStorage();
    storage.values.set(SETTINGS_STORAGE_KEY, '{broken-json');

    expect(readStoredSettings(storage)).toEqual(freshDefaultSettings());
    expect(storage.removedKeys).toEqual([SETTINGS_STORAGE_KEY]);
  });

  it('continues with in-memory settings when storage writes fail', () => {
    const storage: SettingsStorage = {
      getItem: () => null,
      removeItem: () => undefined,
      setItem: () => { throw new Error('storage unavailable'); },
    };

    expect(saveStoredSettings(freshDefaultSettings(), storage)).toBe(false);
  });
});
