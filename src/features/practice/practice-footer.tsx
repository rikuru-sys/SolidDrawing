import type { Settings } from '../settings/practice-settings';

type Props = { settings: Settings; onNext: () => void };

export function PracticeFooter({ settings, onNext }: Props) {
  const message = settings.practiceMode === 'sample-only'
    ? settings.time === null ? '外部ソフトで描き終わったら「次の見本へ」を押します。' : '時間終了後、自動的に次の見本へ進みます。'
    : settings.time === null ? '描き終わったら「保存して次へ」を押します。' : '時間終了後、自動保存して次の問題へ進みます。';
  return <div className="practice-footer">
    <p>{message}</p>
    {settings.time === null && <button className="button primary compact" type="button" onClick={onNext}>{settings.practiceMode === 'sample-only' ? '次の見本へ' : '保存して次へ'}</button>}
  </div>;
}
