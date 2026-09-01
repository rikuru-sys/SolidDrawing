import { describe, expect, it } from 'vitest';
import {
  ALL_LIGHT_DIRECTIONS,
  ALL_SHAPES,
  DEFAULT_SETTINGS,
  freshDefaultSettings,
  toggleLightDirectionSelection,
  toggleShapeSelection,
  updateSettings,
  type Settings,
} from './practice-settings';

describe('practice settings', () => {
  it('既定値の配列を呼び出しごとに作成する', () => {
    const first = freshDefaultSettings();
    const second = freshDefaultSettings();

    first.shapes.pop();
    first.lightDirections.pop();

    expect(second.shapes).toEqual(ALL_SHAPES);
    expect(second.lightDirections).toEqual(ALL_LIGHT_DIRECTIONS);
    expect(second).toMatchObject(DEFAULT_SETTINGS);
  });

  it('updates a value without mutating the previous settings', () => {
    const settings = freshDefaultSettings();
    const updated = updateSettings(settings, { time: 45, difficulty: 'hard' });

    expect(updated.time).toBe(45);
    expect(updated.difficulty).toBe('hard');
    expect(settings.time).toBe(30);
    expect(settings.difficulty).toBe('easy');
  });

  it('adds and removes shape selections without mutating the source array', () => {
    const settings = { ...freshDefaultSettings(), shapes: ['立方体'] as Settings['shapes'] };
    const added = toggleShapeSelection(settings, '円柱');
    const removed = toggleShapeSelection(added, '立方体');

    expect(settings.shapes).toEqual(['立方体']);
    expect(added.shapes).toEqual(['立方体', '円柱']);
    expect(removed.shapes).toEqual(['円柱']);
  });

  it('adds and removes light direction selections', () => {
    const settings = {
      ...freshDefaultSettings(),
      lightDirections: ['top-left'] as Settings['lightDirections'],
    };
    const added = toggleLightDirectionSelection(settings, 'bottom-right');
    const removed = toggleLightDirectionSelection(added, 'top-left');

    expect(added.lightDirections).toEqual(['top-left', 'bottom-right']);
    expect(removed.lightDirections).toEqual(['bottom-right']);
  });
});
