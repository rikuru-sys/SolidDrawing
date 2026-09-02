import { describe, expect, it, vi } from 'vitest';
import { createPrompts, PROMPT_GENERATOR_VERSION } from './prompt-generator';
import type { CreatePromptsOptions } from './prompt-generator';
import type { LightDirection, ShapeName } from './types';

const ALL_SHAPES = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'] as const satisfies readonly ShapeName[];
const ALL_LIGHT_DIRECTIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const satisfies readonly LightDirection[];

const BASE_OPTIONS: CreatePromptsOptions = {
  shapes: ALL_SHAPES,
  count: 20,
  lightDirections: ALL_LIGHT_DIRECTIONS,
  difficulty: 'hard',
  seed: 123456789,
};

describe('createPrompts', () => {
  describe('再現性', () => {
    it('同じシードと設定から同じプロンプト列を生成する', () => {
      expect(createPrompts(BASE_OPTIONS)).toEqual(createPrompts(BASE_OPTIONS));
    });

    // テストではテスト結果の再現性を確保するために、Math.randomが呼び出されないことを確認します。
    it('プロンプト生成ではMath.randomに依存しない', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => {
        throw new Error('Math.random() を使用しないでください。');
      });

      expect(() => createPrompts(BASE_OPTIONS)).not.toThrow();
      randomSpy.mockRestore();
    });

    it('異なるシードから異なるプロンプト列を生成する', () => {
      const first = createPrompts(BASE_OPTIONS);
      const second = createPrompts({ ...BASE_OPTIONS, seed: BASE_OPTIONS.seed + 1 });

      expect(second).not.toEqual(first);
    });
  });

  describe('立体の種類', () => {
    it.each(ALL_SHAPES)('%sだけを選択した場合、その立体だけを生成する', (shape) => {
      const prompts = createPrompts({
        ...BASE_OPTIONS,
        shapes: [shape],
        count: 5,
      });

      expect(prompts.every((prompt) => prompt.shape === shape)).toBe(true);
    });

    it('複数種類を選択した場合、選択範囲内の立体だけを生成する', () => {
      const selectedShapes = ['立方体', '円柱'] as const satisfies readonly ShapeName[];
      const prompts = createPrompts({
        ...BASE_OPTIONS,
        shapes: selectedShapes,
      });

      expect(prompts.every((prompt) => selectedShapes.includes(prompt.shape as typeof selectedShapes[number]))).toBe(true);
    });

    it('対応するすべての立体を生成できる', () => {
      const generatedShapes = ALL_SHAPES.map((shape) => createPrompts({
        ...BASE_OPTIONS,
        shapes: [shape],
        count: 1,
      })[0].shape);

      expect(generatedShapes).toEqual(ALL_SHAPES);
    });
  });

  describe('光源方向', () => {
    it.each(ALL_LIGHT_DIRECTIONS)('%sだけを選択した場合、その光源方向だけを生成する', (lightDirection) => {
      const prompts = createPrompts({
        ...BASE_OPTIONS,
        lightDirections: [lightDirection],
        count: 5,
      });

      expect(prompts.every((prompt) => prompt.lightDirection === lightDirection)).toBe(true);
    });

    it('複数の光源方向を候補にした場合、候補内の1方向だけを各問題へ設定する', () => {
      const selectedDirections = ['top-left', 'bottom-right'] as const satisfies readonly LightDirection[];
      const prompts = createPrompts({
        ...BASE_OPTIONS,
        lightDirections: selectedDirections,
      });

      prompts.forEach((prompt) => {
        expect(selectedDirections).toContain(prompt.lightDirection);
      });
    });

    it('対応するすべての光源方向を生成できる', () => {
      const generatedDirections = ALL_LIGHT_DIRECTIONS.map((lightDirection) => createPrompts({
        ...BASE_OPTIONS,
        lightDirections: [lightDirection],
        count: 1,
      })[0].lightDirection);

      expect(generatedDirections).toEqual(ALL_LIGHT_DIRECTIONS);
    });

    it('光源方向が選択されていない場合は生成しない', () => {
      expect(() => createPrompts({
        ...BASE_OPTIONS,
        lightDirections: [],
      })).toThrow(RangeError);
    });
  });

  describe('連続出題', () => {
    it('複数種類を選択した場合、同じ立体を連続して生成しない', () => {
      const prompts = createPrompts(BASE_OPTIONS);

      prompts.slice(1).forEach((prompt, index) => {
        expect(prompt.shape).not.toBe(prompts[index].shape);
      });
    });
  });

  describe('難易度', () => {
    it('簡単モードでは立体自体を回転させない', () => {
      const prompts = createPrompts({
        ...BASE_OPTIONS,
        difficulty: 'easy',
      });

      prompts.forEach((prompt) => {
        expect(prompt.objectRotationX).toBe(0);
        expect(prompt.objectRotationY).toBe(0);
        expect(prompt.objectRotationZ).toBe(0);
      });
    });

    it('難しいモードでは立体自体の回転値が定義範囲内に収まる', () => {
      const prompts = createPrompts({
        ...BASE_OPTIONS,
        difficulty: 'hard',
      });

      prompts.forEach((prompt) => {
        expect(Math.abs(prompt.objectRotationX)).toBeGreaterThanOrEqual(0.38);
        expect(Math.abs(prompt.objectRotationX)).toBeLessThan(1.02);
        expect(prompt.objectRotationY).toBeGreaterThanOrEqual(-Math.PI);
        expect(prompt.objectRotationY).toBeLessThan(Math.PI);
        expect(prompt.objectRotationZ).toBeGreaterThanOrEqual(-0.55);
        expect(prompt.objectRotationZ).toBeLessThan(0.55);
      });
    });
  });

  describe('生成情報と値の範囲', () => {
    it('生成されたプロンプトへID、シード、バージョン、出題番号を記録する', () => {
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

    it('生成された値が定義された範囲内に収まる', () => {
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
        expect(BASE_OPTIONS.lightDirections).toContain(prompt.lightDirection);
      });
    });
  });
});
