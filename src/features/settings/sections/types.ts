import type { Settings } from '../practice-settings';

export type ChangeSettings = (patch: Partial<Settings>) => void;
