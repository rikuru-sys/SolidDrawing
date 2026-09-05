'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { APP_VERSION } from '../src/config/app-version';
import { useDrawingCanvas } from '../src/features/drawing/use-drawing-canvas';
import { FavoritesScreen } from '../src/features/favorites/favorites-screen';
import type { Favorite } from '../src/features/favorites/types';
import { useFavorites } from '../src/features/favorites/use-favorites';
import { HomeScreen } from '../src/features/home/home-screen';
import { PracticeScreen } from '../src/features/practice/practice-screen';
import { useAttemptFinisher } from '../src/features/practice/use-attempt-finisher';
import { usePracticeSampleCanvases } from '../src/features/practice/use-practice-sample-canvases';
import { usePracticeSession } from '../src/features/practice/use-practice-session';
import { ResultsScreen } from '../src/features/results/results-screen';
import type { Attempt } from '../src/features/results/types';
import { usesDrawingCanvas } from '../src/features/settings/practice-mode';
import type { Settings } from '../src/features/settings/practice-settings';
import {
  readStoredSettings,
  saveStoredSettings,
} from '../src/features/settings/practice-settings-storage';
import { SettingsScreen } from '../src/features/settings/settings-screen';
import { useStoredState } from '../src/shared/storage/use-stored-state';

type Screen = 'home' | 'settings' | 'practice' | 'results' | 'favorites';

const SCREEN_LABELS: Record<Screen, string> = {
  home: 'トップ画面',
  settings: '設定画面',
  practice: '練習画面',
  results: '比較画面',
  favorites: 'お気に入り画面',
};

/** アプリ全体の状態を保持し、機能別の画面とフックを接続する。 */
export default function Home() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useStoredState(
    readStoredSettings,
    saveStoredSettings,
  );
  const finishRef = useRef<(
    endSession?: boolean,
    timedOut?: boolean,
  ) => void>(() => undefined);
  const screenContentRef = useRef<HTMLDivElement>(null);
  const previousScreenRef = useRef(screen);

  const session = usePracticeSession({
    active: screen === 'practice',
    settings,
    onSettingsChange: setSettings,
    onTimeout: () => finishRef.current(false, true),
  });
  const {
    settings: practiceSettings,
    prompt: currentPrompt,
    questionIndex,
    questionCount,
  } = session.current;
  const hasDrawingCanvas = usesDrawingCanvas(practiceSettings.practiceMode);
  const evaluatesShadow = hasDrawingCanvas
    && practiceSettings.sampleStyle === 'shadow';

  const drawing = useDrawingCanvas({
    active: screen === 'practice' && hasDrawingCanvas,
    paused: session.timer.paused,
    penWidth: practiceSettings.penWidth,
    penColor: practiceSettings.penColor,
    penOpacity: practiceSettings.penOpacity,
    stabilization: practiceSettings.stabilization,
    shadowPenEnabled: evaluatesShadow,
  });
  const {
    sampleCanvasRef,
    shapeEvaluationCanvasRef,
    shadowEvaluationCanvasRef,
  } = usePracticeSampleCanvases({
    active: screen === 'practice',
    prompt: currentPrompt,
    style: practiceSettings.sampleStyle,
    evaluatesShadow,
  });
  const favorites = useFavorites(practiceSettings);

  const showResults = useCallback(() => {
    setScreen('results');
  }, []);
  const finishCurrent = useAttemptFinisher({
    prompt: currentPrompt,
    practiceMode: practiceSettings.practiceMode,
    evaluatesShadow,
    sampleCanvasRef,
    shapeEvaluationCanvasRef,
    shadowEvaluationCanvasRef,
    beginFinishing: session.actions.beginFinishing,
    finishAttempt: session.actions.finish,
    getDurationSeconds: session.actions.getDurationSeconds,
    getCurrentStrokes: drawing.getCurrentStrokes,
    exportDrawing: drawing.exportDrawing,
    exportDrawingSvg: drawing.exportDrawingSvg,
    releaseActivePointer: drawing.releaseActivePointer,
    resetDrawing: drawing.resetDrawing,
    onComplete: showResults,
  });

  useEffect(() => {
    finishRef.current = finishCurrent;
  }, [finishCurrent]);

  useEffect(() => {
    if (previousScreenRef.current === screen) return;
    previousScreenRef.current = screen;
    screenContentRef.current?.focus();
  }, [screen]);

  function startPractice(candidate: Settings = settings) {
    if (!session.actions.start(candidate)) return;
    drawing.resetDrawing();
    setScreen('practice');
  }

  function retryCurrentPrompt(attempt: Attempt) {
    session.actions.retry(attempt);
    drawing.resetDrawing();
    setScreen('practice');
  }

  function startFavoritePractice(favorite: Favorite) {
    session.actions.startFavorite(favorite);
    drawing.resetDrawing();
    setScreen('practice');
  }

  function stopPractice() {
    const message = hasDrawingCanvas
      ? 'ここまでの描画を保存して、比較画面へ移動しますか？'
      : 'ここまでの練習を記録して、結果画面へ移動しますか？';
    if (window.confirm(message)) finishCurrent(true);
  }

  return (
    <>
      <a className="skip-link" href="#screen-content">本文へ移動</a>
      <main className="app-shell">
        <div
          ref={screenContentRef}
          id="screen-content"
          className="screen-content"
          role="region"
          aria-label={SCREEN_LABELS[screen]}
          tabIndex={-1}
        >
          {screen === 'home' && (
            <HomeScreen
              appVersion={APP_VERSION}
              onStart={() => startPractice()}
              onOpenSettings={() => setScreen('settings')}
              onOpenFavorites={() => setScreen('favorites')}
            />
          )}

          {screen === 'settings' && (
            <SettingsScreen
              settings={settings}
              setSettings={setSettings}
              validation={session.validation.message}
              onValidationClear={session.validation.clear}
              onStart={() => startPractice()}
              onBack={() => setScreen('home')}
            />
          )}

          {screen === 'practice' && currentPrompt && (
            <>
              {evaluatesShadow && (
                <>
                  <canvas
                    ref={shapeEvaluationCanvasRef}
                    className="evaluation-sample-canvas"
                    width={180}
                    height={180}
                    aria-hidden="true"
                  />
                  <canvas
                    ref={shadowEvaluationCanvasRef}
                    className="evaluation-sample-canvas"
                    width={180}
                    height={180}
                    aria-hidden="true"
                  />
                </>
              )}
              <PracticeScreen
                current={{
                  prompt: currentPrompt,
                  questionIndex,
                  questionCount,
                  settings: practiceSettings,
                }}
                timer={session.timer}
                drawing={{
                  tool: drawing.tool,
                  strokeCount: drawing.strokes.length,
                  redoCount: drawing.redoStrokes.length,
                  canvasRef: drawing.drawingCanvasRef,
                  brushCursorRef: drawing.brushCursorRef,
                  onToolChange: drawing.setTool,
                  onPenStyleChange: session.actions.updateSettings,
                  onUndo: drawing.undo,
                  onRedo: drawing.redo,
                  onClear: drawing.clear,
                  onPointerEnter: drawing.updateBrushCursor,
                  onPointerDown: drawing.beginStroke,
                  onPointerMove: drawing.continueStroke,
                  onPointerEnd: drawing.endStroke,
                  onPointerLeave: drawing.hideBrushCursor,
                }}
                actions={{
                  onTogglePaused: session.actions.togglePaused,
                  onStop: stopPractice,
                  onNext: () => finishCurrent(false),
                }}
                sampleCanvasRef={sampleCanvasRef}
              />
            </>
          )}

          {screen === 'favorites' && (
            <FavoritesScreen
              favorites={favorites.favorites}
              selectedFavorite={favorites.selectedFavorite}
              onSelectFavorite={favorites.selectFavorite}
              onPracticeFavorite={startFavoritePractice}
              onDeleteFavorite={favorites.deleteSelectedFavorite}
              onStartPractice={() => startPractice()}
              onBack={() => setScreen('home')}
            />
          )}

          {screen === 'results' && session.results.attempts.length > 0 && (
            <ResultsScreen
              attempts={session.results.attempts}
              isFavorite={favorites.isFavorite}
              onRetryCurrent={retryCurrentPrompt}
              onRetrySession={() => startPractice(practiceSettings)}
              onToggleFavorite={favorites.toggleFavorite}
              onBack={() => setScreen('home')}
            />
          )}
        </div>
      </main>
    </>
  );
}
