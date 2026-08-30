'use client';

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPrompts } from '../src/domain/prompt/prompt-generator';
import type {
  LightDirection,
  PromptGeneration,
  ShapeName,
  ShapePrompt,
} from '../src/domain/prompt/types';
import {
  clampSeed,
  createSessionSeed,
} from '../src/domain/random/seeded-random';
import { applyStrokeStyle } from '../src/features/drawing/stroke-rendering';
import { stabilizeStrokePoint } from '../src/features/drawing/stabilization';
import { drawingToSvgDataUrl } from '../src/features/drawing/svg-renderer';
import type {
  DrawingToolId,
  Point,
  Stroke,
} from '../src/features/drawing/types';
import {
  createDrawingStroke,
  getDrawingTool,
} from '../src/features/drawing/tools/tool-registry';
import {
  evaluateShape,
  unevaluatedShape,
} from '../src/features/evaluation/shape-evaluator';
import { FavoritesScreen } from '../src/features/favorites/favorites-screen';
import type { Favorite } from '../src/features/favorites/types';
import {
  countdownSnapshot,
  elapsedTimerSeconds,
  practiceDurationSeconds,
} from '../src/features/practice/practice-timer';
import { PracticeScreen, type PracticePenStylePatch } from '../src/features/practice/practice-screen';
import {
  downloadAllAttemptComparisons,
  downloadAttemptComparison,
  downloadAttemptDrawing,
  downloadAttemptSample,
} from '../src/features/results/result-export';
import { ResultsScreen } from '../src/features/results/results-screen';
import type { Attempt, ComparisonMode } from '../src/features/results/types';
import {
  ALL_LIGHT_DIRECTIONS,
  ALL_SHAPES,
  DEFAULT_SETTINGS,
  normalizeStoredSettings,
  readStoredSettings,
  saveStoredSettings,
  type SampleStyle,
  type Settings,
} from '../src/features/settings/practice-settings';
import { SettingsScreen } from '../src/features/settings/settings-screen';
import { disposeSample3D, renderSample3D } from './three-sample';

type Screen = 'home' | 'settings' | 'practice' | 'results' | 'favorites';

function parseStoredPrompt(value: unknown): ShapePrompt | null {
  if (!value || typeof value !== 'object') return null;
  const prompt = value as Record<string, unknown>;
  const numericKeys = [
    'widthScale',
    'heightScale',
    'depthScale',
    'cameraAzimuth',
    'cameraElevation',
    'objectRotationX',
    'objectRotationY',
    'objectRotationZ',
  ] as const;
  if (typeof prompt.id !== 'string'
    || typeof prompt.shape !== 'string'
    || !ALL_SHAPES.includes(prompt.shape as ShapeName)
    || typeof prompt.lightDirection !== 'string'
    || !ALL_LIGHT_DIRECTIONS.includes(prompt.lightDirection as LightDirection)
    || !numericKeys.every((key) => typeof prompt[key] === 'number' && Number.isFinite(prompt[key]))) {
    return null;
  }
  const storedGeneration = prompt.generation;
  const generation: PromptGeneration | undefined = storedGeneration
    && typeof storedGeneration === 'object'
    && typeof (storedGeneration as Record<string, unknown>).seed === 'number'
    && Number.isFinite((storedGeneration as Record<string, unknown>).seed)
    && (storedGeneration as Record<string, unknown>).version === 1
    && typeof (storedGeneration as Record<string, unknown>).index === 'number'
    && Number.isInteger((storedGeneration as Record<string, unknown>).index)
    ? {
      seed: ((storedGeneration as Record<string, unknown>).seed as number) >>> 0,
      version: 1,
      index: (storedGeneration as Record<string, unknown>).index as number,
    }
    : undefined;

  return {
    id: prompt.id,
    shape: prompt.shape as ShapeName,
    widthScale: prompt.widthScale as number,
    heightScale: prompt.heightScale as number,
    depthScale: prompt.depthScale as number,
    cameraAzimuth: prompt.cameraAzimuth as number,
    cameraElevation: prompt.cameraElevation as number,
    objectRotationX: prompt.objectRotationX as number,
    objectRotationY: prompt.objectRotationY as number,
    objectRotationZ: prompt.objectRotationZ as number,
    lightDirection: prompt.lightDirection as LightDirection,
    ...(generation ? { generation } : {}),
  };
}

function readStoredFavorites(): Favorite[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem('solid-drawing-favorites');
    if (!saved) return [];
    const parsed = JSON.parse(saved) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((value): Favorite[] => {
      if (!value || typeof value !== 'object') return [];
      const item = value as Record<string, unknown>;
      const prompt = parseStoredPrompt(item.prompt);
      if (!prompt || !item.settings || typeof item.settings !== 'object') return [];
      return [{
        id: typeof item.id === 'string' ? item.id : `favorite-${prompt.id}`,
        prompt,
        settings: normalizeStoredSettings(item.settings as Record<string, unknown>),
        createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
      }];
    }).slice(0, 100);
  } catch {
    return [];
  }
}

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

function drawSample(canvas: HTMLCanvasElement, prompt: ShapePrompt, background = '#ffffff', style: SampleStyle = 'shaded') {
  renderSample3D(canvas, prompt, style, background);
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(readStoredSettings);
  const [sessionSettings, setSessionSettings] = useState<Settings | null>(null);
  const [prompts, setPrompts] = useState<ShapePrompt[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remaining, setRemaining] = useState(DEFAULT_SETTINGS.time ?? 0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tool, setTool] = useState<DrawingToolId>('pen');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedResult, setSelectedResult] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState(0.72);
  const [validation, setValidation] = useState('');
  const [favorites, setFavorites] = useState<Favorite[]>(readStoredFavorites);
  const [selectedFavoriteId, setSelectedFavoriteId] = useState<string | null>(null);

  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const favoriteCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushCursorRef = useRef<HTMLDivElement>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const remainingRef = useRef(DEFAULT_SETTINGS.time ?? 0);
  const elapsedRef = useRef(0);
  const finishingRef = useRef(false);
  const finishRef = useRef<(endSession?: boolean, timedOut?: boolean) => void>(() => undefined);

  const currentPrompt = prompts[questionIndex];
  const currentResult = attempts[selectedResult];
  const practiceSettings = sessionSettings ?? settings;
  const selectedFavorite = favorites.find(({ id }) => id === selectedFavoriteId) ?? favorites[0];
  const isCurrentFavorite = currentResult
    ? favorites.some(({ prompt }) => prompt.id === currentResult.prompt.id)
    : false;

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    try {
      window.localStorage.setItem('solid-drawing-favorites', JSON.stringify(favorites));
    } catch {
      // Favorites remain available for the current visit when storage is unavailable.
    }
  }, [favorites]);

  const paintStroke = useCallback((context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) => {
    if (!stroke.points.length) return;
    context.save();
    applyStrokeStyle(context, stroke);
    if (stroke.points.length === 1) {
      context.beginPath();
      context.arc(stroke.points[0].x * width, stroke.points[0].y * height, context.lineWidth / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.beginPath();
      context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height);
      stroke.points.slice(1).forEach((point) => context.lineTo(point.x * width, point.y * height));
      context.stroke();
    }
    context.restore();
  }, []);

  const redrawDrawing = useCallback((nextStrokes = strokesRef.current) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    nextStrokes.forEach((stroke) => paintStroke(context, stroke, rect.width, rect.height));
  }, [paintStroke]);

  useEffect(() => {
    strokesRef.current = strokes;
    if (screen === 'practice') redrawDrawing(strokes);
  }, [redrawDrawing, screen, strokes]);

  useEffect(() => {
    if (screen !== 'home' || !heroCanvasRef.current) return;
    const canvas = heroCanvasRef.current;
    const render = () => drawSample(canvas, HERO_PROMPT, '#fffef9');
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      disposeSample3D(canvas);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== 'favorites' || !selectedFavorite || !favoriteCanvasRef.current) return;
    const canvas = favoriteCanvasRef.current;
    const render = () => drawSample(
      canvas,
      selectedFavorite.prompt,
      '#ffffff',
      selectedFavorite.settings.sampleStyle,
    );
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      disposeSample3D(canvas);
    };
  }, [screen, selectedFavorite]);

  useEffect(() => {
    if (screen !== 'practice' || !currentPrompt || !sampleCanvasRef.current) return;
    const canvas = sampleCanvasRef.current;
    const render = () => drawSample(canvas, currentPrompt, '#ffffff', practiceSettings.sampleStyle);
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => {
      observer.disconnect();
      disposeSample3D(canvas);
    };
  }, [currentPrompt, practiceSettings.sampleStyle, screen]);

  useEffect(() => {
    if (screen !== 'practice' || !drawingCanvasRef.current) return;
    const canvas = drawingCanvasRef.current;
    const observer = new ResizeObserver(() => redrawDrawing());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redrawDrawing, screen]);

  const exportDrawing = useCallback((offsetX = 0, offsetY = 0) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return '';
    const output = document.createElement('canvas');
    output.width = canvas.width;
    output.height = canvas.height;
    const context = output.getContext('2d');
    if (!context) return '';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(
      canvas,
      Math.round(offsetX * output.width),
      Math.round(offsetY * output.height),
    );
    return output.toDataURL('image/png');
  }, []);

  const exportDrawingSvg = useCallback((strokesToExport: Stroke[], offsetX = 0, offsetY = 0) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return '';
    const bounds = canvas.getBoundingClientRect();
    return drawingToSvgDataUrl(strokesToExport, {
      width: bounds.width || canvas.width || 1,
      height: bounds.height || canvas.height || 1,
      offsetX,
      offsetY,
    });
  }, []);

  const finishCurrent = useCallback((endSession = false, timedOut = false) => {
    if (finishingRef.current || !currentPrompt || !sampleCanvasRef.current) return;
    finishingRef.current = true;
    const evaluationStrokes = activeStrokeRef.current
      ? [...strokesRef.current, activeStrokeRef.current]
      : strokesRef.current;
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
    const pointerId = activePointerIdRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas && pointerId !== null && drawingCanvas.hasPointerCapture(pointerId)) {
      drawingCanvas.releasePointerCapture(pointerId);
    }
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    const seconds = practiceDurationSeconds({
      timeLimit: practiceSettings.time,
      remainingSeconds: remainingRef.current,
      elapsedSeconds: elapsedRef.current,
      timedOut,
    });
    const nextAttempts = [...attempts, {
      prompt: currentPrompt,
      sampleImage,
      drawingImage,
      alignedDrawingImage,
      drawingSvg,
      alignedDrawingSvg,
      seconds,
      evaluation,
      practiceMode: practiceSettings.practiceMode,
    }];
    setAttempts(nextAttempts);

    const isLast = questionIndex >= prompts.length - 1;
    if (isLast || endSession) {
      setSelectedResult(Math.max(0, nextAttempts.length - 1));
      setPaused(false);
      setScreen('results');
      window.setTimeout(() => { finishingRef.current = false; }, 0);
      return;
    }

    setQuestionIndex((index) => index + 1);
    remainingRef.current = practiceSettings.time ?? 0;
    elapsedRef.current = 0;
    setRemaining(remainingRef.current);
    setElapsed(0);
    setStrokes([]);
    setRedoStrokes([]);
    setPaused(false);
    window.setTimeout(() => { finishingRef.current = false; }, 0);
  }, [attempts, currentPrompt, exportDrawing, exportDrawingSvg, practiceSettings.practiceMode, practiceSettings.time, prompts.length, questionIndex]);

  useEffect(() => {
    finishRef.current = finishCurrent;
  }, [finishCurrent]);

  useEffect(() => {
    if (screen !== 'practice' || paused) return;
    const startedAt = performance.now();
    let timer: number | undefined;
    let finished = false;

    if (practiceSettings.time === null) {
      const startingElapsed = elapsedRef.current;
      const tick = () => {
        const nextElapsed = elapsedTimerSeconds(startingElapsed, startedAt, performance.now());
        if (nextElapsed !== elapsedRef.current) {
          elapsedRef.current = nextElapsed;
          setElapsed(nextElapsed);
        }
      };
      timer = window.setInterval(tick, 100);
    } else {
      const deadline = startedAt + Math.max(0, remainingRef.current) * 1000;
      const tick = () => {
        const snapshot = countdownSnapshot(deadline, performance.now());
        if (snapshot.complete) {
          if (finished) return;
          finished = true;
          remainingRef.current = 0;
          setRemaining(0);
          if (timer !== undefined) window.clearInterval(timer);
          window.setTimeout(() => finishRef.current(false, true), 0);
          return;
        }
        const nextRemaining = snapshot.remainingSeconds;
        if (nextRemaining !== remainingRef.current) {
          remainingRef.current = nextRemaining;
          setRemaining(nextRemaining);
        }
      };
      tick();
      timer = window.setInterval(tick, 100);
    }

    return () => {
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [paused, practiceSettings.time, questionIndex, screen]);

  const goTo = (target: Screen) => {
    if (target === 'practice' && !prompts.length) return;
    if (target === 'results' && !attempts.length) return;
    setScreen(target);
  };

  const updatePracticePenStyle = (patch: PracticePenStylePatch) => {
    setSessionSettings((current) => ({ ...(current ?? settings), ...patch }));
    setSettings((current) => ({ ...current, ...patch }));
  };

  const startPractice = (practiceSettings: Settings = settings) => {
    const count = Math.max(1, Math.min(20, Number(practiceSettings.count) || 1));
    if (!practiceSettings.shapes.length) {
      setValidation('少なくとも1つの立体を選んでください。');
      return;
    }
    if (practiceSettings.sampleStyle === 'shadow' && !practiceSettings.lightDirections.length) {
      setValidation('光源の方向を少なくとも1つ選んでください。');
      return;
    }
    const normalized = {
      ...practiceSettings,
      count,
      fixedSeed: clampSeed(practiceSettings.fixedSeed),
    };
    setSettings(normalized);
    setSessionSettings(normalized);
    setPrompts(createPrompts({
      shapes: normalized.shapes,
      count,
      lightDirections: normalized.lightDirections.length
        ? normalized.lightDirections
        : ALL_LIGHT_DIRECTIONS,
      difficulty: normalized.difficulty,
      seed: normalized.seedMode === 'fixed'
        ? normalized.fixedSeed
        : createSessionSeed(),
    }));
    setQuestionIndex(0);
    remainingRef.current = normalized.time ?? 0;
    elapsedRef.current = 0;
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    setRemaining(remainingRef.current);
    setElapsed(0);
    setPaused(false);
    setStrokes([]);
    setRedoStrokes([]);
    setAttempts([]);
    setSelectedResult(0);
    finishingRef.current = false;
    setScreen('practice');
  };

  const retryCurrentPrompt = () => {
    if (!currentResult) return;
    const retrySettings = sessionSettings ?? settings;
    setSessionSettings(retrySettings);
    setPrompts([{
      ...currentResult.prompt,
      id: `${currentResult.prompt.id}-retry-${Date.now()}`,
    }]);
    setQuestionIndex(0);
    remainingRef.current = retrySettings.time ?? 0;
    elapsedRef.current = 0;
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    setRemaining(remainingRef.current);
    setElapsed(0);
    setPaused(false);
    setStrokes([]);
    setRedoStrokes([]);
    finishingRef.current = false;
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
    const favoriteSettings = { ...favorite.settings, count: 1 };
    setSessionSettings(favoriteSettings);
    setPrompts([{ ...favorite.prompt }]);
    setQuestionIndex(0);
    remainingRef.current = favoriteSettings.time ?? 0;
    elapsedRef.current = 0;
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    setRemaining(remainingRef.current);
    setElapsed(0);
    setPaused(false);
    setStrokes([]);
    setRedoStrokes([]);
    setAttempts([]);
    setSelectedResult(0);
    finishingRef.current = false;
    setScreen('practice');
  };

  const deleteSelectedFavorite = () => {
    if (!selectedFavorite) return;
    setFavorites((current) => current.filter(({ id }) => id !== selectedFavorite.id));
    setSelectedFavoriteId(null);
  };

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const updateBrushCursor = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const cursor = brushCursorRef.current;
    if (!cursor) return;
    if (event.pointerType === 'touch' || paused) {
      cursor.style.opacity = '0';
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    cursor.style.left = `${event.clientX - rect.left}px`;
    cursor.style.top = `${event.clientY - rect.top}px`;
    cursor.style.opacity = '1';
  };

  const hideBrushCursor = () => {
    if (brushCursorRef.current) brushCursorRef.current.style.opacity = '0';
  };

  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    updateBrushCursor(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointerIdRef.current = event.pointerId;
    activeStrokeRef.current = createDrawingStroke(tool, {
      point: canvasPoint(event),
      width: practiceSettings.penWidth,
      color: practiceSettings.penColor,
      opacity: practiceSettings.penOpacity,
      stabilization: practiceSettings.stabilization,
    });
    setRedoStrokes([]);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>, finishing = false) => {
    updateBrushCursor(event);
    const stroke = activeStrokeRef.current;
    const canvas = drawingCanvasRef.current;
    if (!stroke || !canvas || paused) return;
    const rawPoint = canvasPoint(event);
    const previousPoint = stroke.points[stroke.points.length - 1];
    const rect = canvas.getBoundingClientRect();
    const nextPoint = stabilizeStrokePoint(
      previousPoint,
      rawPoint,
      stroke.stabilization,
      rect.width,
      rect.height,
      finishing,
    );
    if (Math.hypot(nextPoint.x - previousPoint.x, nextPoint.y - previousPoint.y) < 0.0001) return;
    const strokeTool = getDrawingTool(stroke.tool);
    const dashOffset = strokeTool.continuesDashPattern
      ? stroke.points.slice(1).reduce((total, point, index) => {
        const start = stroke.points[index];
        return total + Math.hypot(
          (point.x - start.x) * rect.width,
          (point.y - start.y) * rect.height,
        );
      }, 0)
      : 0;
    stroke.points.push(nextPoint);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.save();
    applyStrokeStyle(context, stroke);
    if (strokeTool.continuesDashPattern) context.lineDashOffset = -dashOffset;
    context.beginPath();
    context.moveTo(previousPoint.x * rect.width, previousPoint.y * rect.height);
    context.lineTo(nextPoint.x * rect.width, nextPoint.y * rect.height);
    context.stroke();
    context.restore();
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokeRef.current;
    if (stroke && event.type === 'pointerup') continueStroke(event, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    activePointerIdRef.current = null;
    if (!stroke) return;
    activeStrokeRef.current = null;
    setStrokes((current) => [...current, stroke]);
  };

  const undo = () => {
    setStrokes((current) => {
      const last = current[current.length - 1];
      if (!last) return current;
      setRedoStrokes((redo) => [...redo, last]);
      return current.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStrokes((current) => {
      const last = current[current.length - 1];
      if (!last) return current;
      setStrokes((drawn) => [...drawn, last]);
      return current.slice(0, -1);
    });
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
          onValidationClear={() => setValidation('')}
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
          tool={tool}
          strokeCount={strokes.length}
          redoCount={redoStrokes.length}
          sampleCanvasRef={sampleCanvasRef}
          drawingCanvasRef={drawingCanvasRef}
          brushCursorRef={brushCursorRef}
          onTogglePaused={() => setPaused((value) => !value)}
          onStop={stopPractice}
          onNext={() => finishCurrent(false)}
          onToolChange={setTool}
          onPenStyleChange={updatePracticePenStyle}
          onUndo={undo}
          onRedo={redo}
          onClear={() => { setStrokes([]); setRedoStrokes([]); }}
          onPointerEnter={updateBrushCursor}
          onPointerDown={beginStroke}
          onPointerMove={continueStroke}
          onPointerEnd={endStroke}
          onPointerLeave={hideBrushCursor}
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
