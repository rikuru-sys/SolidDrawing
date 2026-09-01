'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ShapePrompt } from '../src/domain/prompt/types';
import { useDrawingCanvas } from '../src/features/drawing/use-drawing-canvas';
import { FavoritesScreen } from '../src/features/favorites/favorites-screen';
import { readStoredFavorites, saveStoredFavorites } from '../src/features/favorites/favorite-storage';
import type { Favorite } from '../src/features/favorites/types';
import { HomeScreen } from '../src/features/home/home-screen';
import { PracticeScreen, type PracticePenStylePatch } from '../src/features/practice/practice-screen';
import { usePracticeSession } from '../src/features/practice/use-practice-session';
import { captureAttempt } from '../src/features/results/attempt-capture';
import { ResultsScreen } from '../src/features/results/results-screen';
import type { Attempt } from '../src/features/results/types';
import { usesDrawingCanvas } from '../src/features/settings/practice-mode';
import {
  readStoredSettings,
  saveStoredSettings,
} from '../src/features/settings/practice-settings-storage';
import type { Settings } from '../src/features/settings/practice-settings';
import { SettingsScreen } from '../src/features/settings/settings-screen';
import { useSampleCanvas } from '../src/features/sample/use-sample-canvas';
import { useStoredState } from '../src/shared/storage/use-stored-state';

type Screen = 'home' | 'settings' | 'practice' | 'results' | 'favorites';

/**
 * 画面のラベル。スクリーンリーダー用に使用する。
 */
const SCREEN_LABELS: Record<Screen, string> = {
  home: 'トップ画面',
  settings: '設定画面',
  practice: '練習画面',
  results: '比較画面',
  favorites: 'お気に入り画面',
};

/**
 * アプリのバージョン番号。ユーザーに表示するために使用する。
 */
const APP_VERSION = '2026.09.01.1';

/**
 * 見本の立方体のプロンプト。
 */
const HERO_PROMPT: ShapePrompt = {
  id: 'hero-cube',
  shape: '立方体',
  widthScale: 1,
  heightScale: 1,
  depthScale: 1,
  cameraAzimuth: -0.7,
  cameraElevation: 0.48,
  objectRotationX: 0,
  objectRotationY: 0,
  objectRotationZ: 0,
  lightDirection: 'top-left',
};

/**
 * アプリのメイン画面コンポーネント。
 */
export default function Home() {
  // 画面と端末に保存するデータの状態
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useStoredState(readStoredSettings, saveStoredSettings);
  const [favorites, setFavorites] = useStoredState(readStoredFavorites, saveStoredFavorites);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null);

  // DOM要素と最新の終了処理を保持する参照
  const finishRef = useRef<(endSession?: boolean, timedOut?: boolean) => void>(() => undefined);
  const screenContentRef = useRef<HTMLDivElement>(null);
  const previousScreenRef = useRef(screen);

  // 練習セッション
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
  const {
    remainingSeconds: remaining,
    elapsedSeconds: elapsed,
    paused,
  } = session.timer;
  const { attempts } = session.results;
  const { message: validation, clear: clearValidation } = session.validation;
  const {
    start: startSession,
    retry: retrySessionPrompt,
    startFavorite: startFavoriteSession,
    beginFinishing,
    finish: finishAttempt,
    getDurationSeconds,
    togglePaused,
    updateSettings: updateSessionSettings,
  } = session.actions;

  // 描画キャンバス
  const drawing = useDrawingCanvas({
    active: screen === 'practice' && hasDrawingCanvas,
    paused,
    penWidth: practiceSettings.penWidth,
    penColor: practiceSettings.penColor,
    penOpacity: practiceSettings.penOpacity,
    stabilization: practiceSettings.stabilization,
  });
  const {
    exportDrawing,
    exportDrawingSvg,
    getCurrentStrokes,
    releaseActivePointer,
    resetDrawing,
  } = drawing;

  // 画面に表示する計算済みの値
  const selectedFavorite = favorites.find(({ id }) => id === selectedFavoriteId) ?? favorites[0];

  // 各画面の3D見本キャンバス
  const heroCanvasRef = useSampleCanvas({
    active: screen === 'home',
    prompt: HERO_PROMPT,
    background: '#fffef9',
  });
  const favoriteCanvasRef = useSampleCanvas({
    active: screen === 'favorites',
    prompt: selectedFavorite?.prompt,
    style: selectedFavorite?.settings.sampleStyle,
  });
  const sampleCanvasRef = useSampleCanvas({
    active: screen === 'practice',
    prompt: currentPrompt,
    style: practiceSettings.sampleStyle,
  });

  // 状態の変化に伴う副作用
  useEffect(() => {
    if (previousScreenRef.current === screen) return;
    previousScreenRef.current = screen;
    screenContentRef.current?.focus();
  }, [screen]);

  // タイマーからも呼ばれるため、参照を安定させる終了処理
  const finishCurrent = useCallback((endSession = false, timedOut = false) => {
    const sampleCanvas = sampleCanvasRef.current;
    if (!currentPrompt || !sampleCanvas || !beginFinishing()) return;

    const attempt = captureAttempt({
      prompt: currentPrompt,
      sampleCanvas,
      practiceMode: practiceSettings.practiceMode,
      seconds: getDurationSeconds(timedOut),
      getCurrentStrokes,
      exportDrawing,
      exportDrawingSvg,
    });

    releaseActivePointer();
    if (finishAttempt(attempt, endSession)) {
      setScreen('results');
      return;
    }
    resetDrawing();
  }, [beginFinishing, currentPrompt, exportDrawing, exportDrawingSvg, finishAttempt, getCurrentStrokes, getDurationSeconds, practiceSettings.practiceMode, releaseActivePointer, resetDrawing, sampleCanvasRef]);

  useEffect(() => {
    finishRef.current = finishCurrent;
  }, [finishCurrent]);

  // ユーザー操作から呼ばれる通常の関数
  function isFavorite(attempt: Attempt) {
    return favorites.some(({ prompt }) => prompt.id === attempt.prompt.id);
  }

  function updatePracticePenStyle(patch: PracticePenStylePatch) {
    updateSessionSettings(patch);
  }

  /**
   * 練習を開始する。描画キャンバスがある場合は、描画をリセットして練習画面へ移動する。
   * @param candidate - 練習を開始する設定。指定しない場合は、現在の設定を使用する。
   */
  function startPractice(candidate: Settings = settings) {
    if (!startSession(candidate)) return;
    resetDrawing();
    setScreen('practice');
  }

  /**
   * 現在のプロンプトを再試行する。描画キャンバスがある場合は、描画をリセットして練習画面へ戻る。
   * @param attempt - 再試行する記号の試行結果。
   */
  function retryCurrentPrompt(attempt: Attempt) {
    retrySessionPrompt(attempt);
    resetDrawing();
    setScreen('practice');
  }

  /**
   * 選択中のお気に入りを切り替える。すでにお気に入りに登録されている場合は削除する。
   * @param attempt - お気に入りに追加する記号。すでにお気に入りに登録されている場合は削除する。
   */
  function toggleFavorite(attempt: Attempt) {
    setFavorites((current) => {
      const exists = current.some(({ prompt }) => prompt.id === attempt.prompt.id);
      if (exists) return current.filter(({ prompt }) => prompt.id !== attempt.prompt.id);
      const favoriteSettings = practiceSettings;
      return [{
        id: `favorite-${attempt.prompt.id}`,
        prompt: { ...attempt.prompt },
        settings: {
          ...favoriteSettings,
          shapes: [...favoriteSettings.shapes],
          lightDirections: [...favoriteSettings.lightDirections],
        },
        createdAt: Date.now(),
      }, ...current];
    });
  }

  /**
   * 練習画面を開始する。お気に入りから開始する場合は、選択中のお気に入りの設定を使用する。
   * @param favorite - 開始するお気に入り。指定しない場合は、現在の設定を使用する。
   */
  function startFavoritePractice(favorite: Favorite) {
    startFavoriteSession(favorite);
    resetDrawing();
    setScreen('practice');
  }

  /**
   *  選択中のお気に入りを削除する。
   */
  function deleteSelectedFavorite() {
    if (!selectedFavorite) return;
    setFavorites((current) => current.filter(({ id }) => id !== selectedFavorite.id));
    setSelectedFavoriteId(null);
  }

  /**
   * 練習を中断する。描画キャンバスがある場合は、描画を保存して比較画面へ移動するか確認する。
   */
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
      <div ref={screenContentRef} id="screen-content" className="screen-content" role="region" aria-label={SCREEN_LABELS[screen]} tabIndex={-1}>
      {screen === 'home' && (
        <HomeScreen
          canvasRef={heroCanvasRef}
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
          validation={validation}
          onValidationClear={clearValidation}
          onStart={() => startPractice()}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'practice' && currentPrompt && (
        <PracticeScreen
          prompt={currentPrompt}
          questionIndex={questionIndex}
          questionCount={questionCount}
          settings={practiceSettings}
          remainingSeconds={remaining}
          elapsedSeconds={elapsed}
          paused={paused}
          tool={drawing.tool}
          strokeCount={drawing.strokes.length}
          redoCount={drawing.redoStrokes.length}
          sampleCanvasRef={sampleCanvasRef}
          drawingCanvasRef={drawing.drawingCanvasRef}
          brushCursorRef={drawing.brushCursorRef}
          onTogglePaused={togglePaused}
          onStop={stopPractice}
          onNext={() => finishCurrent(false)}
          onToolChange={drawing.setTool}
          onPenStyleChange={updatePracticePenStyle}
          onUndo={drawing.undo}
          onRedo={drawing.redo}
          onClear={drawing.clear}
          onPointerEnter={drawing.updateBrushCursor}
          onPointerDown={drawing.beginStroke}
          onPointerMove={drawing.continueStroke}
          onPointerEnd={drawing.endStroke}
          onPointerLeave={drawing.hideBrushCursor}
        />
      )}

      {screen === 'favorites' && (
        <FavoritesScreen
          favorites={favorites}
          selectedFavorite={selectedFavorite ?? null}
          canvasRef={favoriteCanvasRef}
          onSelectFavorite={setSelectedFavoriteId}
          onPracticeFavorite={startFavoritePractice}
          onDeleteFavorite={deleteSelectedFavorite}
          onStartPractice={() => startPractice()}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'results' && attempts.length > 0 && (
        <ResultsScreen
          attempts={attempts}
          isFavorite={isFavorite}
          onRetryCurrent={retryCurrentPrompt}
          onRetrySession={() => startPractice(practiceSettings)}
          onToggleFavorite={toggleFavorite}
          onBack={() => setScreen('home')}
        />
      )}
      </div>
    </main>
    </>
  );
}
