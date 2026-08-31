import type { ShapePrompt } from '../../domain/prompt/types';

export type ThreeShapePrompt = Omit<ShapePrompt, 'id' | 'generation'>;
