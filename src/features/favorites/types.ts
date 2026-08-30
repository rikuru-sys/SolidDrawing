import type { ShapePrompt } from '../../domain/prompt/types';
import type { Settings } from '../settings/practice-settings';

export type Favorite = {
  id: string;
  prompt: ShapePrompt;
  settings: Settings;
  createdAt: number;
};
