import type { ShapePrompt } from '../../domain/prompt/types';

export type ThreeShapePrompt = Omit<ShapePrompt, 'id' | 'generation'>;

/** 3D見本から描画する要素。通常表示と評価用Canvasで使い分ける。 */
export type SampleRenderLayer = 'complete' | 'shape' | 'shadow';
