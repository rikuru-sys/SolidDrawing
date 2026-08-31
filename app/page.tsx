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
import { PracticeScreen, type PracticePenStylePatch } from '../src/features/practice/practice-screen';
import { usePracticeSession } from '../src/features/practice/use-practice-session';
import {
  downloadAllAttemptComparisons,
  downloadAttemptComparison,
  downloadAttemptDrawing,
  downloadAttemptSample,
} from '../src/features/results/result-export';
import { ResultsScreen } from '../src/features/results/results-screen';
import type { ComparisonMode } from '../src/features/results/types';
import {
  readStoredSettings,
  saveStoredSettings,
  type Settings,
} from '../src/features/settings/practice-settings';
import { SettingsScreen } from '../src/features/settings/settings-screen';
import { useSampleCanvas } from '../src/features/sample/use-sample-canvas';

type Screen = 'home' | 'settings' | 'practice' | 'results' | 'favorites';


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
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState(0.72);
  const [favorites, setFavorites] = useState<Favorite[]>(readStoredFavorites);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null);

  const finishRef = useRef<(endSession?: boolean, timedOut?: boolean) => void>(() => undefined);

  const session = usePracticeSession({
    active: screen === 'practice',
    settings,
    onSettingsChange: setSettings,
    onTimeout: () => finishRef.current(false, true),
  });
  const {
    sessionSettings,
    setSessionSettings,
    practiceSettings,
    prompts,
    currentPrompt,
    questionIndex,
    remainingSeconds: remaining,
    elapsedSeconds: elapsed,
    paused,
    setPaused,
    attempts,
    currentResult,
    selectedResult,
    setSelectedResult,
    validation,
    clearValidation,
    startPractice: startSession,
    retryCurrentPrompt: retrySessionPrompt,
    startFavoritePractice: startFavoriteSession,
    tryStartFinishing,
    finishAttempt,
    getDurationSeconds,
  } = session;
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
  const isCurrentFavorite = currentResult
    ? favorites.some(({ prompt }) => prompt.id === currentResult.prompt.id)
    : false;

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredFavorites(favorites);
  }, [favorites]);

  const finishCurrent = useCallback((endSession = false, timedOut = false) => {
    if (!currentPrompt || !sampleCanvasRef.current || !tryStartFinishing()) return;
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
    const completed = finishAttempt({
      prompt: currentPrompt,
      sampleImage,
      drawingImage,
      alignedDrawingImage,
      drawingSvg,
      alignedDrawingSvg,
      seconds: getDurationSeconds(timedOut),
      evaluation,
      practiceMode: practiceSettings.practiceMode,
    }, endSession);

    if (completed) {
      setScreen('results');
      return;
    }
    resetDrawing();
  }, [currentPrompt, exportDrawing, exportDrawingSvg, finishAttempt, getCurrentStrokes, getDurationSeconds, practiceSettings.practiceMode, releaseActivePointer, resetDrawing, sampleCanvasRef, tryStartFinishing]);

  useEffect(() => {
    finishRef.current = finishCurrent;
  }, [finishCurrent]);

  const goTo = (target: Screen) => {
    if (target === 'practice' && !prompts.length) return;
    if (target === 'results' && !attempts.length) return;
    setScreen(target);
  };

  const updatePracticePenStyle = (patch: PracticePenStylePatch) => {
    setSessionSettings((current) => ({ ...(current ?? settings), ...patch }));
    setSettings((current) => ({ ...current, ...patch }));
  };

  const startPractice = (candidate: Settings = settings) => {
    if (!startSession(candidate)) return;
    resetDrawing();
    setScreen('practice');
  };

  const retryCurrentPrompt = () => {
    if (!currentResult) return;
    retrySessionPrompt(currentResult);
    resetDrawing();
    setScreen('practice');
  };

  const toggleCurrentFavorite = () => {
    if (!currentResult) return;
    setFavorites((current) => {
      const exists = current.some(({ prompt }) => prompt.id === currentResult.prompt.id);
      if (exists) return current.filter(({ prompt }) => prompt.id !== currentResult.prompt.id);
      const favoriteSettings = sessionSettings ?? settings;
      return [{
        id: `favorite-${currentResult.prompt.id}`,
        prompt: { ...currentResult.prompt },
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
    startFavoriteSession(favorite);
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

  const saveComparison = () => {
    if (!currentResult) return;
    void downloadAttemptComparison({
      attempt: currentResult,
      index: selectedResult,
      mode: comparisonMode,
      overlayOpacity,
    });
  };

  const saveDrawing = () => {
    if (currentResult) downloadAttemptDrawing(currentResult, selectedResult);
  };

  const saveSample = () => {
    if (currentResult) downloadAttemptSample(currentResult, selectedResult);
  };

  const saveAllComparisons = (mode: ComparisonMode) => {
    void downloadAllAttemptComparisons({ attempts, mode, overlayOpacity });
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => goTo('home')}>
          <span className="brand-mark" aria-hidden="true">◇</span>
          <span>立体ドローイング</span>
        </button>
        <nav className="step-nav" aria-label="ページ">
          {([
            ['home', '1 トップ'],
            ['settings', '2 設定'],
            ['practice', '3 練習'],
            ['results', '4 比較'],
            ['favorites', '★ お気に入り'],
          ] as Array<[Screen, string]>).map(([value, label]) => {
            const disabled = (value === 'practice' && !prompts.length) || (value === 'results' && !attempts.length);
            return (
              <button
                key={value}
                className={screen === value ? 'step active' : 'step'}
                type="button"
                disabled={disabled}
                aria-current={screen === value ? 'step' : undefined}
                onClick={() => goTo(value)}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      {screen === 'home' && (
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">短時間で、形を見る力を鍛える</p>
            <h1>立体を観察して、<br />手を動かそう。</h1>
            <p className="lead">ランダムな方向から見た3D立体を、決めた時間内に描く練習です。最後に見本と自分の線を並べて振り返れます。</p>
            <div className="button-row hero-actions">
              <button className="button primary" type="button" onClick={() => startPractice()}>開始する</button>
              <button className="button secondary" type="button" onClick={() => setScreen('settings')}>設定する</button>
            </div>
            <ul className="feature-list">
              <li>6種類の3D立体をその場で生成</li>
              <li>10〜60秒、または時間制限なし</li>
              <li>最大20回まで連続練習</li>
            </ul>
          </div>
          <div className="hero-visual">
            <canvas ref={heroCanvasRef} className="hero-canvas" aria-label="薄い陰影が付いた立方体" />
            <span className="visual-caption">ランダムな角度で出題</span>
          </div>
        </section>
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
          questionCount={prompts.length}
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
          onTogglePaused={() => setPaused((value) => !value)}
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
          selectedResult={selectedResult}
          comparisonMode={comparisonMode}
          overlayOpacity={overlayOpacity}
          isCurrentFavorite={isCurrentFavorite}
          onSelectResult={setSelectedResult}
          onComparisonModeChange={setComparisonMode}
          onOverlayOpacityChange={setOverlayOpacity}
          onRetryCurrent={retryCurrentPrompt}
          onRetrySession={() => startPractice(sessionSettings ?? settings)}
          onToggleFavorite={toggleCurrentFavorite}
          onSaveSample={saveSample}
          onSaveComparison={saveComparison}
          onSaveDrawing={saveDrawing}
          onSaveAllComparisons={saveAllComparisons}
        />
      )}
    </main>
  );
}
