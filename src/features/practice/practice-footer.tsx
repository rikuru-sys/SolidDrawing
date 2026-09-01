import { usesDrawingCanvas } from '../settings/practice-mode';
import type { Settings } from '../settings/practice-settings';

type Props = { settings: Settings; onNext: () => void };

export function PracticeFooter({ settings, onNext }: Props) {
  const hasDrawingCanvas = usesDrawingCanvas(settings.practiceMode);
  const message = hasDrawingCanvas
    ? settings.time === null ? '描き終わったら「保存して次へ」を押します。' : '時間終了後、自動保存して次の問題へ進みます。'
    : settings.time === null ? '外部ソフトで描き終わったら「次の見本へ」を押します。' : '時間終了後、自動的に次の見本へ進みます。';
  return <div className="practice-footer">
    <p id="practice-instruction">{message}</p>
    {settings.time === null && <button className="button primary compact" type="button" onClick={onNext}>{hasDrawingCanvas ? '保存して次へ' : '次の見本へ'}</button>}
  </div>;
}
