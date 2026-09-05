import { describe, expect, it } from 'vitest';
import type { ShapePrompt } from '../../domain/prompt/types';
import { createPromptIdentity } from './prompt-identity';

function prompt(overrides: Partial<ShapePrompt> = {}): ShapePrompt {
  return {
    id: 'v1-00000001-1',
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
    generation: { seed: 1, version: 1, index: 0 },
    ...overrides,
  };
}

describe('prompt identity', () => {
  it('再挑戦で出題IDが変わっても同じ見本として判定する', () => {
    const original = prompt();
    const retry = prompt({ id: `${original.id}-retry-100` });

    expect(createPromptIdentity(retry)).toBe(createPromptIdentity(original));
  });

  it('同じシード由来のIDでも表示結果が違えば別の見本として判定する', () => {
    const original = prompt();
    const rotated = prompt({ objectRotationY: 0.8 });

    expect(rotated.id).toBe(original.id);
    expect(createPromptIdentity(rotated)).not.toBe(createPromptIdentity(original));
  });
});
