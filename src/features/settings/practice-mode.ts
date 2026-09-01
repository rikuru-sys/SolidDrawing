import type { PracticeMode } from './practice-settings';

export type PracticeModeDetails = {
  label: string;
  compactLabel: string;
  detailLabel: string;
  description: string;
  usesDrawingCanvas: boolean;
};

export const PRACTICE_MODE_DETAILS = {
  canvas: {
    label: 'サイト内で描く',
    compactLabel: 'サイト内描画',
    detailLabel: 'サイト内で描く',
    description: '見本と描画スペースを表示し、最後に自動評価します',
    usesDrawingCanvas: true,
  },
  'sample-only': {
    label: '見本のみ表示',
    compactLabel: '見本のみ',
    detailLabel: '見本のみ',
    description: '使い慣れたペイントソフトで描くため、見本を大きく表示します',
    usesDrawingCanvas: false,
  },
} satisfies Record<PracticeMode, PracticeModeDetails>;

const PRACTICE_MODE_ORDER = ['canvas', 'sample-only'] as const;

export const PRACTICE_MODE_OPTIONS = PRACTICE_MODE_ORDER.map((value) => ({
  value,
  ...PRACTICE_MODE_DETAILS[value],
}));

export function practiceModeDetails(mode: PracticeMode): PracticeModeDetails {
  return PRACTICE_MODE_DETAILS[mode];
}

export function usesDrawingCanvas(mode: PracticeMode): boolean {
  return practiceModeDetails(mode).usesDrawingCanvas;
}
