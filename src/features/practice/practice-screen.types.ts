import type { Settings } from '../settings/practice-settings';

export type PracticePenStylePatch = Partial<Pick<
  Settings,
  'penWidth' | 'penColor' | 'penOpacity' | 'stabilization'
>>;
