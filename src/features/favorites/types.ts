import type { ShapePrompt } from '../../domain/prompt/types';

export type Favorite = {
  /** 向き、比率、光源を含む再現可能な立体情報。 */
  prompt: ShapePrompt;
};
