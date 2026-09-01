'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ShapePrompt } from '../src/domain/prompt/types';
import { useDrawingCanvas } from '../src/features/drawing/use-drawing-canvas';
import {
  evaluateShape,
  unevaluatedShape,
} from '../src/features/evaluation/shape-evaluator';
import { FavoritesScreen } from '../src/features/favorites/favorites-screen';
import { readStoredFavorites, saveStoredFavorites } from '../src/features/favorites/favorite-storage';
import type { Favorite } from '../src/features/favorites/types';
import { HomeScreen } from '../src/features/home/home-screen';
import { PracticeScreen, type PracticePenStylePatch } from '../src/features/practice/practice-screen';
import { usePracticeSession } from '../src/features/practice/use-practice-session';
import { ResultsScreen } from '../src/features/results/results-screen';
import type { Attempt } from '../src/features/results/types';
import {
  readStoredSettings,
  saveStoredSettings,
  type Settings,
} from '../src/features/settings/practice-settings';
import { SettingsScreen } from '../src/features/settings/settings-screen';
import { useSampleCanvas } from '../src/features/sample/use-sample-canvas';

type Screen = 'home' | 'settings' | 'practice' | 'results' | 'favorites';

const SCREEN_LABELS: Record<Screen, string> = {
  home: 'トップ画面',
  settings: '設定画面',
  practice: '練習画面',
  results: '比較画面',
  favorites: 'お気に入り画面',
};
const APP_VERSION = '2026.09.01.1';

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

export default function Home() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(readStoredSettings);
  const [favorites, setFavorites] = useState<Favorite[]>(readStoredFavorites);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null);

  const finishRef = useRef<(endSession?: boolean, timedOut?: boolean) => void>(() => undefined);
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
  const {
    remainingSeconds: remaining,
    elapsedSeconds: elapsed,
    paused,
  } = session.timer;
  const { attempts } = session.results;
  const { message: validation, clear: clearValidation } = session.validation;
  const drawing = useDrawingCanvas({
    active: screen === 'practice' && practiceSettings.practiceMode === 'canvas',
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
  const selectedFavorite = favorites.find(({ id }) => id === selectedFavoriteId) ?? favorites[0];
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
  const isFavorite = (attempt: Attempt) => (
    favorites.some(({ prompt }) => prompt.id === attempt.prompt.id)
  );

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    if (previousScreenRef.current === screen) return;
    previousScreenRef.current = screen;
    screenContentRef.current?.focus();
  }, [screen]);

  const finishCurrent = useCallback((endSession = false, timedOut = false) => {
    if (!currentPrompt || !sampleCanvasRef.current || !session.actions.beginFinishing()) return;
    const evaluationStrokes = getCurrentStrokes();
    const evaluation = practiceSettings.practiceMode === 'sample-only'
      ? unevaluatedShape()
      : evaluateShape(sampleCanvasRef.current, evaluationStrokes);
    const sampleImage = sampleCanvasRef.current.toDataURL('image/png');
    const drawingImage = practiceSettings.practiceMode === 'sample-only' ? '' : exportDrawing();
    const alignedDrawingImage = practiceSettings.practiceMode === 'sample-only'
      ? ''
      : exportDrawing(evaluation.alignmentX, evaluation.alignmentY);
    const drawingSvg = practiceSettings.practiceMode === 'sample-only'
      ? ''
      : exportDrawingSvg(evaluationStrokes);
    const alignedDrawingSvg = practiceSettings.practiceMode === 'sample-only'
      ? ''
      : exportDrawingSvg(evaluationStrokes, evaluation.alignmentX, evaluation.alignmentY);
    releaseActivePointer();
    const completed = session.actions.finish({
      prompt: currentPrompt,
      sampleImage,
      drawingImage,
      alignedDrawingImage,
      drawingSvg,
      alignedDrawingSvg,
      seconds: session.actions.getDurationSeconds(timedOut),
      evaluation,
      practiceMode: practiceSettings.practiceMode,
    }, endSession);

    if (completed) {
      setScreen('results');
      return;
    }
    resetDrawing();
  }, [currentPrompt, exportDrawing, exportDrawingSvg, getCurrentStrokes, practiceSettings.practiceMode, releaseActivePointer, resetDrawing, sampleCanvasRef, session.actions]);

  useEffect(() => {
    finishRef.current = finishCurrent;
  }, [finishCurrent]);

  const updatePracticePenStyle = (patch: PracticePenStylePatch) => {
    session.actions.updateSettings(patch);
  };

  const startPractice = (candidate: Settings = settings) => {
    if (!session.actions.start(candidate)) return;
    resetDrawing();
    setScreen('practice');
  };

  const retryCurrentPrompt = (attempt: Attempt) => {
    session.actions.retry(attempt);
    resetDrawing();
    setScreen('practice');
  };

  const toggleFavorite = (attempt: Attempt) => {
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
  };

  const startFavoritePractice = (favorite: Favorite) => {
    session.actions.startFavorite(favorite);
    resetDrawing();
    setScreen('practice');
  };

  const deleteSelectedFavorite = () => {
    if (!selectedFavorite) return;
    setFavorites((current) => current.filter(({ id }) => id !== selectedFavorite.id));
    setSelectedFavoriteId(null);
  };

  const stopPractice = () => {
    const message = practiceSettings.practiceMode === 'sample-only'
      ? 'ここまでの練習を記録して、結果画面へ移動しますか？'
      : 'ここまでの描画を保存して、比較画面へ移動しますか？';
    if (window.confirm(message)) finishCurrent(true);
  };

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
          onTogglePaused={session.actions.togglePaused}
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
