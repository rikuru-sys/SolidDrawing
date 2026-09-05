import type { ShapePrompt } from '../../domain/prompt/types';
import type { Settings } from '../settings/practice-settings';

export const FAVORITE_SNAPSHOT_VERSION = 1 as const;

export type FavoriteSampleSnapshot = {
  promptKey: string;
  prompt: ShapePrompt;
};

export type FavoritePracticeSnapshot = {
  settings: Settings;
};

export type Favorite = {
  id: string;
  snapshotVersion: typeof FAVORITE_SNAPSHOT_VERSION;
  sample: FavoriteSampleSnapshot;
  savedPractice: FavoritePracticeSnapshot;
  createdWithAppVersion: string;
  createdAt: number;
};
