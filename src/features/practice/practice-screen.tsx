'use client';

import type { PointerEventHandler, RefObject } from 'react';
import type { ShapePrompt } from '../../domain/prompt/types';
import type { DrawingToolId, Stabilization } from '../drawing/types';
import { DRAWING_TOOLS, getDrawingTool } from '../drawing/tools/tool-registry';
import type { Settings } from '../settings/practice-settings';
import { LIGHT_DIRECTION_OPTIONS } from '../settings/settings-options';
import { formatTimerSeconds } from './practice-timer';

export type PracticePenStylePatch = Partial<Pick<
  Settings,
  'penWidth' | 'penColor' | 'penOpacity' | 'stabilization'
>>;

export type PracticeScreenProps = {
  prompt: ShapePrompt;
  questionIndex: number;
  questionCount: number;
  settings: Settings;
  remainingSeconds: number;
  elapsedSeconds: number;
  paused: boolean;
  tool: DrawingToolId;
  strokeCount: number;
  redoCount: number;
  sampleCanvasRef: RefObject<HTMLCanvasElement | null>;
  drawingCanvasRef: RefObject<HTMLCanvasElement | null>;
  brushCursorRef: RefObject<HTMLDivElement | null>;
  onTogglePaused: () => void;
  onStop: () => void;
  onNext: () => void;
  onToolChange: (tool: DrawingToolId) => void;
  onPenStyleChange: (patch: PracticePenStylePatch) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onPointerEnter: PointerEventHandler<HTMLCanvasElement>;
  onPointerDown: PointerEventHandler<HTMLCanvasElement>;
  onPointerMove: PointerEventHandler<HTMLCanvasElement>;
  onPointerEnd: PointerEventHandler<HTMLCanvasElement>;
  onPointerLeave: () => void;
};

export function PracticeScreen({
  prompt,
  questionIndex,
  questionCount,
  settings,
  remainingSeconds,
  elapsedSeconds,
  paused,
  tool,
  strokeCount,
  redoCount,
  sampleCanvasRef,
  drawingCanvasRef,
  brushCursorRef,
  onTogglePaused,
  onStop,
  onNext,
  onToolChange,
  onPenStyleChange,
  onUndo,
  onRedo,
  onClear,
  onPointerEnter,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  onPointerLeave,
}: PracticeScreenProps) {
  const activeDrawingTool = getDrawingTool(tool);
  const brushCursorSize = activeDrawingTool.getCursorSize(settings.penWidth);
  const currentLight = LIGHT_DIRECTION_OPTIONS.find(({ value }) => value === prompt.lightDirection);
  const sampleHideAfterSeconds = settings.time === null ? 15 : Math.ceil(settings.time / 2);
  const currentQuestionElapsed = settings.time === null
    ? elapsedSeconds
    : Math.max(0, settings.time - remainingSeconds);
  const sampleHiddenByMode = settings.sampleVisibility === 'partway'
    && currentQuestionElapsed >= sampleHideAfterSeconds;
  const secondsUntilSampleHide = Math.max(0, sampleHideAfterSeconds - currentQuestionElapsed);

  return (
    <section className="practice-section">
      <div className="practice-header">
        <div className="progress-area">
          <div className="progress-label"><strong>{questionIndex + 1} / {questionCount}</strong><span>{prompt.shape}</span></div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={questionCount}
            aria-valuenow={questionIndex + 1}
            aria-label="練習の進捗"
          >
            <span style={{ width: `${((questionIndex + 1) / questionCount) * 100}%` }} />
          </div>
        </div>
        <div className="timer" aria-live="polite">
          <small>{settings.time === null ? '経過時間' : '残り時間'}</small>
          <strong>{formatTimerSeconds(settings.time === null ? elapsedSeconds : remainingSeconds)}</strong>
        </div>
        <div className="practice-actions">
          <button className="button secondary compact" type="button" onClick={onTogglePaused}>{paused ? '再開' : '一時停止'}</button>
          <button className="text-button danger" type="button" onClick={onStop}>終了</button>
        </div>
      </div>

      <div className={settings.practiceMode === 'sample-only'
        ? 'workspace-layout sample-only-layout'
        : `workspace-layout layout-${settings.layout}`}>
        <section className="work-panel sample-panel">
          <div className="work-panel-header">
            <strong>見本</strong>
            <small>
              {(settings.sampleStyle === 'shadow' && currentLight
                ? `${settings.difficulty === 'hard' ? '難しい' : '簡単'}・光源 ${currentLight.label} ${currentLight.arrow}`
                : settings.difficulty === 'hard'
                  ? '難しい・立体の向きもランダム'
                  : '簡単・見る方向はランダム')
                + (settings.sampleVisibility === 'partway' ? '・途中で非表示' : '')}
            </small>
          </div>
          <div className="canvas-stage">
            <canvas
              ref={sampleCanvasRef}
              className={paused || sampleHiddenByMode ? 'sample-canvas hidden-sample' : 'sample-canvas'}
              aria-label={`${prompt.shape}の見本`}
              aria-hidden={paused || sampleHiddenByMode}
            />
            {settings.sampleStyle === 'shadow' && currentLight && !paused && !sampleHiddenByMode && (
              <span className="light-direction-badge">
                光源 {currentLight.label} <b aria-hidden="true">{currentLight.arrow}</b>
              </span>
            )}
            {settings.sampleVisibility === 'partway' && !paused && !sampleHiddenByMode && (
              <span className="sample-hide-countdown">あと {secondsUntilSampleHide}秒で非表示</span>
            )}
            {paused ? (
              <div className="pause-cover">
                <strong>一時停止中</strong>
                <span>{sampleHiddenByMode ? '再開後も見本は非表示です' : '再開すると見本を表示します'}</span>
              </div>
            ) : sampleHiddenByMode ? (
              <div className="sample-hidden-cover" role="status">
                <strong>見本を隠しました</strong>
                <span>記憶を頼りに描きましょう</span>
              </div>
            ) : null}
          </div>
        </section>
        {settings.practiceMode === 'canvas' && (
          <section className="work-panel drawing-panel">
            <div className="work-panel-header"><strong>描画スペース</strong><small>ペン・タッチ・マウス対応</small></div>
            <div className="canvas-stage">
              <canvas
                ref={drawingCanvasRef}
                className="drawing-canvas"
                aria-label="描画キャンバス"
                onPointerEnter={onPointerEnter}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onPointerLeave={onPointerLeave}
              />
              <div
                ref={brushCursorRef}
                className={`brush-cursor ${tool}`}
                style={{
                  width: brushCursorSize,
                  height: brushCursorSize,
                  borderColor: activeDrawingTool.cursorUsesPenColor ? settings.penColor : undefined,
                }}
                aria-hidden="true"
              />
              {paused && <div className="drawing-pause-shield" aria-hidden="true" />}
            </div>
            <div className="drawing-toolbar" aria-label="描画ツール">
              <div className="drawing-tool-group">
                {DRAWING_TOOLS.map((drawingTool) => (
                  <button
                    key={drawingTool.id}
                    className={tool === drawingTool.id ? 'tool-button selected' : 'tool-button'}
                    type="button"
                    aria-pressed={tool === drawingTool.id}
                    onClick={() => onToolChange(drawingTool.id)}
                  >
                    {drawingTool.label}
                  </button>
                ))}
              </div>
              <div className="drawing-style-controls">
                <label className="toolbar-width-control">
                  <span>太さ</span>
                  <select
                    value={settings.penWidth}
                    onChange={(event) => onPenStyleChange({ penWidth: Number(event.target.value) })}
                    aria-label="練習中のペンの太さ"
                  >
                    <option value="2">細い</option>
                    <option value="3">普通</option>
                    <option value="5">太い</option>
                  </select>
                </label>
                <label className="toolbar-stabilization-control">
                  <span>手振れ</span>
                  <select
                    value={settings.stabilization}
                    onChange={(event) => onPenStyleChange({ stabilization: event.target.value as Stabilization })}
                    aria-label="練習中の手振れ補正"
                  >
                    <option value="off">なし</option>
                    <option value="low">弱</option>
                    <option value="medium">中</option>
                  </select>
                </label>
                <label className="toolbar-color-control">
                  <span>色</span>
                  <input
                    type="color"
                    value={settings.penColor}
                    onChange={(event) => onPenStyleChange({ penColor: event.target.value })}
                    aria-label="練習中のペン色"
                  />
                </label>
                <label className="toolbar-opacity-control">
                  <span>濃さ {Math.round(settings.penOpacity * 100)}%</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={settings.penOpacity}
                    onChange={(event) => onPenStyleChange({ penOpacity: Number(event.target.value) })}
                    aria-label="練習中のペンの不透明度"
                  />
                </label>
              </div>
              <div className="drawing-tool-group history-tools">
                <button className="tool-button" type="button" disabled={!strokeCount} onClick={onUndo}>元に戻す</button>
                <button className="tool-button" type="button" disabled={!redoCount} onClick={onRedo}>やり直す</button>
                <button className="tool-button" type="button" disabled={!strokeCount} onClick={onClear}>全消去</button>
              </div>
            </div>
          </section>
        )}
      </div>
      <div className="practice-footer">
        <p>{settings.practiceMode === 'sample-only'
          ? settings.time === null
            ? '外部ソフトで描き終わったら「次の見本へ」を押します。'
            : '時間終了後、自動的に次の見本へ進みます。'
          : settings.time === null
            ? '描き終わったら「保存して次へ」を押します。'
            : '時間終了後、自動保存して次の問題へ進みます。'}</p>
        {settings.time === null && (
          <button className="button primary compact" type="button" onClick={onNext}>
            {settings.practiceMode === 'sample-only' ? '次の見本へ' : '保存して次へ'}
          </button>
        )}
      </div>
    </section>
  );
}
