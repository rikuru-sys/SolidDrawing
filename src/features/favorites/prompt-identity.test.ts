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
  it('再挑戦で出題IDが変わっても同じ立体として判定する', () => {
    const original = prompt();
    const retry = prompt({ id: `${original.id}-retry-100` });

    expect(createPromptIdentity(retry)).toBe(createPromptIdentity(original));
  });

  it('回転や光源などの表示結果が違えば別の立体として判定する', () => {
    const original = prompt();
    const rotated = prompt({ objectRotationY: 0.8 });
    const relit = prompt({ lightDirection: 'bottom-right' });

    expect(createPromptIdentity(rotated)).not.toBe(createPromptIdentity(original));
    expect(createPromptIdentity(relit)).not.toBe(createPromptIdentity(original));
  });
});
