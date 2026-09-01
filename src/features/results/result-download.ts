import type { ComparisonMode } from './types';

export type ExportKind = 'comparison' | 'drawing' | 'sample' | 'all';

export function formatFileTimestamp(date = new Date()) {
  function pad(value: number) {
    return String(value).padStart(2, '0');
  }

  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日_${pad(date.getHours())}時${pad(date.getMinutes())}分`;
}

export function resultFileName(
  kind: ExportKind,
  options: { date?: Date; index?: number; shape?: string; mode?: ComparisonMode } = {},
) {
  const timestamp = formatFileTimestamp(options.date);
  if (kind === 'all') {
    return `立体ドローイング_全結果_${options.mode === 'overlay' ? '重ね合わせ' : '横並び'}_${timestamp}.png`;
  }
  const number = (options.index ?? 0) + 1;
  const shape = options.shape ?? '立体';
  if (kind === 'drawing') return `立体ドローイング_描画_${number}_${shape}_${timestamp}.png`;
  if (kind === 'sample') return `立体ドローイング_見本_${number}_${shape}_${timestamp}.png`;
  return `立体ドローイング_${options.mode === 'overlay' ? '重ね合わせ' : '比較'}_${number}_${shape}_${timestamp}.png`;
}

export function downloadDataUrl(url: string, name: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
}
