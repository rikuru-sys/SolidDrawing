import { describe, expect, it, vi } from 'vitest';
import { createPrompts, PROMPT_GENERATOR_VERSION } from './prompt-generator';
import type { CreatePromptsOptions } from './prompt-generator';

const BASE_OPTIONS: CreatePromptsOptions = {
  shapes: ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'],
  count: 20,
  lightDirections: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  difficulty: 'hard',
  seed: 123456789,
};

describe('createPrompts', () => {
  it('creates identical prompts from the same seed and settings', () => {
    expect(createPrompts(BASE_OPTIONS)).toEqual(createPrompts(BASE_OPTIONS));
  });

  it('does not use Math.random while generating prompts', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random must not be used for prompt generation.');
    });

    expect(() => createPrompts(BASE_OPTIONS)).not.toThrow();
    randomSpy.mockRestore();
  });

  it('records the seed, version and question index on every prompt', () => {
    const prompts = createPrompts(BASE_OPTIONS);

    expect(prompts).toHaveLength(20);
    prompts.forEach((prompt, index) => {
      expect(prompt.id).toBe(`v${PROMPT_GENERATOR_VERSION}-075bcd15-${index + 1}`);
      expect(prompt.generation).toEqual({
        seed: 123456789,
        version: PROMPT_GENERATOR_VERSION,
        index,
      });
    });
  });

  it('creates a different sequence from a different seed', () => {
    const first = createPrompts(BASE_OPTIONS);
    const second = createPrompts({ ...BASE_OPTIONS, seed: BASE_OPTIONS.seed + 1 });

    expect(second).not.toEqual(first);
  });

  it('does not repeat a shape consecutively when multiple shapes are available', () => {
    const prompts = createPrompts(BASE_OPTIONS);

    prompts.slice(1).forEach((prompt, index) => {
      expect(prompt.shape).not.toBe(prompts[index].shape);
    });
  });

  it('keeps generated values inside their defined ranges', () => {
    const prompts = createPrompts(BASE_OPTIONS);

    prompts.forEach((prompt) => {
      expect(prompt.widthScale).toBeGreaterThanOrEqual(0.82);
      expect(prompt.widthScale).toBeLessThan(1.14);
      expect(prompt.heightScale).toBeGreaterThanOrEqual(0.84);
      expect(prompt.heightScale).toBeLessThan(1.15);
      expect(prompt.depthScale).toBeGreaterThanOrEqual(0.78);
      expect(prompt.depthScale).toBeLessThan(1.12);
      expect(prompt.cameraAzimuth).toBeGreaterThanOrEqual(-Math.PI);
      expect(prompt.cameraAzimuth).toBeLessThan(Math.PI);
      expect(prompt.cameraElevation).toBeGreaterThanOrEqual(0.24);
      expect(prompt.cameraElevation).toBeLessThan(0.82);
      expect(Math.abs(prompt.objectRotationX)).toBeGreaterThanOrEqual(0.38);
      expect(Math.abs(prompt.objectRotationX)).toBeLessThan(1.02);
      expect(prompt.objectRotationY).toBeGreaterThanOrEqual(-Math.PI);
      expect(prompt.objectRotationY).toBeLessThan(Math.PI);
      expect(prompt.objectRotationZ).toBeGreaterThanOrEqual(-0.55);
      expect(prompt.objectRotationZ).toBeLessThan(0.55);
      expect(BASE_OPTIONS.lightDirections).toContain(prompt.lightDirection);
    });
  });
});
