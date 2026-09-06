type Props = {
  onRetry: () => void;
};

/** 3D見本を生成できなかった場合に、利用者へ再試行手段を表示する。 */
export function SampleRenderError({ onRetry }: Props) {
  return (
    <div className="sample-render-error" role="alert">
      <strong>3D見本を表示できませんでした</strong>
      <span>ブラウザの3D表示機能を確認して、もう一度お試しください。</span>
      <button className="button secondary compact" type="button" onClick={onRetry}>
        再試行する
      </button>
    </div>
  );
}
