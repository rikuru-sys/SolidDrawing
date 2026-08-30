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
  Stabilization,
  Stroke,
} from '../src/features/drawing/types';
import {
  createDrawingStroke,
  DRAWING_TOOLS,
  getDrawingTool,
} from '../src/features/drawing/tools/tool-registry';
import {
  evaluateShape,
  unevaluatedShape,
} from '../src/features/evaluation/shape-evaluator';
import type { ShapeEvaluation } from '../src/features/evaluation/types';
import {
  countdownSnapshot,
  elapsedTimerSeconds,
  formatTimerSeconds,
  practiceDurationSeconds,
} from '../src/features/practice/practice-timer';
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
import { LIGHT_DIRECTION_OPTIONS } from '../src/features/settings/settings-options';
import { disposeSample3D, renderSample3D } from './three-sample';

type Screen = 'home' | 'settings' | 'practice' | 'results' | 'favorites';
type Favorite = {
  id: string;
  prompt: ShapePrompt;
  settings: Settings;
  createdAt: number;
};

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

function sampleStyleLabel(style: SampleStyle) {
  if (style === 'shadow') return '輪郭線と影';
  if (style === 'hidden-lines') return '輪郭線（点線）';
  return '輪郭線と薄い陰影';
}

function drawImageContained(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function formatFileTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(date.getDate())}日_${pad(date.getHours())}時${pad(date.getMinutes())}分`;
}

function formatEvaluationDetails(evaluation: ShapeEvaluation) {
  return `輪郭 ${evaluation.outline}点　傾き ${evaluation.angle}点　大きさ ${evaluation.size}点　比率 ${evaluation.proportion}点`;
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
  const activeDrawingTool = getDrawingTool(tool);
  const brushCursorSize = activeDrawingTool.getCursorSize(practiceSettings.penWidth);
  const selectedFavorite = favorites.find(({ id }) => id === selectedFavoriteId) ?? favorites[0];
  const isCurrentFavorite = currentResult
    ? favorites.some(({ prompt }) => prompt.id === currentResult.prompt.id)
    : false;
  const currentLight = currentPrompt
    ? LIGHT_DIRECTION_OPTIONS.find(({ value }) => value === currentPrompt.lightDirection)
    : undefined;
  const selectedFavoriteLight = selectedFavorite
    ? LIGHT_DIRECTION_OPTIONS.find(({ value }) => value === selectedFavorite.prompt.lightDirection)
    : undefined;
  const sampleHideAfterSeconds = practiceSettings.time === null
    ? 15
    : Math.ceil(practiceSettings.time / 2);
  const currentQuestionElapsed = practiceSettings.time === null
    ? elapsed
    : Math.max(0, practiceSettings.time - remaining);
  const sampleHiddenByMode = practiceSettings.sampleVisibility === 'partway'
    && currentQuestionElapsed >= sampleHideAfterSeconds;
  const secondsUntilSampleHide = Math.max(0, sampleHideAfterSeconds - currentQuestionElapsed);

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

  const updatePracticePenStyle = (patch: Partial<Pick<Settings, 'penWidth' | 'penColor' | 'penOpacity' | 'stabilization'>>) => {
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

  const downloadDataUrl = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  };

  const saveComparison = async () => {
    if (!currentResult) return;
    const output = document.createElement('canvas');
    output.width = 1240;
    output.height = 740;
    const context = output.getContext('2d');
    if (!context) return;
    context.fillStyle = '#f1efe8';
    context.fillRect(0, 0, output.width, output.height);
    context.fillStyle = '#25261f';
    context.font = 'bold 32px sans-serif';
    context.fillText(`${selectedResult + 1}. ${currentResult.prompt.shape}`, 50, 56);
    context.font = '20px sans-serif';

    const load = (source: string) => new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = source;
    });
    const [sample, drawing] = await Promise.all([
      load(currentResult.sampleImage),
      load(comparisonMode === 'overlay' ? currentResult.alignedDrawingSvg : currentResult.drawingSvg),
    ]);
    if (comparisonMode === 'overlay') {
      context.fillText('見本と描画の重ね合わせ', 50, 108);
      context.fillStyle = '#ffffff';
      context.fillRect(180, 130, 880, 500);
      drawImageContained(context, sample, 180, 130, 880, 500);
      context.save();
      context.globalAlpha = overlayOpacity;
      context.globalCompositeOperation = 'multiply';
      drawImageContained(context, drawing, 180, 130, 880, 500);
      context.restore();
    } else {
      context.fillText('見本', 50, 108);
      context.fillText('描いたもの', 645, 108);
      context.fillStyle = '#ffffff';
      context.fillRect(50, 130, 545, 500);
      context.fillRect(645, 130, 545, 500);
      drawImageContained(context, sample, 50, 130, 545, 500);
      drawImageContained(context, drawing, 645, 130, 545, 500);
    }
    context.fillStyle = '#686b60';
    context.font = '18px sans-serif';
    context.fillText(`描画時間 ${currentResult.seconds}秒　総合評価 ${currentResult.evaluation.score}点`, 50, 674);
    context.fillText(formatEvaluationDetails(currentResult.evaluation), 50, 708);
    downloadDataUrl(
      output.toDataURL('image/png'),
      `立体ドローイング_${comparisonMode === 'overlay' ? '重ね合わせ' : '比較'}_${selectedResult + 1}_${currentResult.prompt.shape}_${formatFileTimestamp()}.png`,
    );
  };

  const saveDrawing = () => {
    if (!currentResult) return;
    downloadDataUrl(
      currentResult.drawingImage,
      `立体ドローイング_描画_${selectedResult + 1}_${currentResult.prompt.shape}_${formatFileTimestamp()}.png`,
    );
  };

  const saveSample = () => {
    if (!currentResult) return;
    downloadDataUrl(
      currentResult.sampleImage,
      `立体ドローイング_見本_${selectedResult + 1}_${currentResult.prompt.shape}_${formatFileTimestamp()}.png`,
    );
  };

  const saveAllComparisons = async (mode: ComparisonMode) => {
    if (!attempts.length) return;
    const output = document.createElement('canvas');
    const columnCount = 2;
    const canvasWidth = 1600;
    const outerPadding = 40;
    const columnGap = 20;
    const rowGap = 20;
    const headerHeight = 120;
    const cardHeight = 430;
    const rowCount = Math.ceil(attempts.length / columnCount);
    const cardWidth = (canvasWidth - outerPadding * 2 - columnGap) / columnCount;
    output.width = canvasWidth;
    output.height = headerHeight + rowCount * cardHeight + Math.max(0, rowCount - 1) * rowGap + 30;
    const context = output.getContext('2d');
    if (!context) return;

    context.fillStyle = '#f1efe8';
    context.fillRect(0, 0, output.width, output.height);
    context.fillStyle = '#25261f';
    context.font = 'bold 34px sans-serif';
    context.fillText('立体ドローイング　練習結果', outerPadding, 55);
    context.fillStyle = '#686b60';
    context.font = '18px sans-serif';
    context.fillText(
      `${attempts.length}回分・${mode === 'overlay' ? '中心合わせ重ね合わせ' : '見本と描画の横並び'}・2列表示`,
      outerPadding,
      91,
    );

    const load = (source: string) => new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = source;
    });

    for (const [index, attempt] of attempts.entries()) {
      const column = index % columnCount;
      const row = Math.floor(index / columnCount);
      const left = outerPadding + column * (cardWidth + columnGap);
      const top = headerHeight + row * (cardHeight + rowGap);
      const cardPadding = 18;
      const paneGap = 14;
      const paneWidth = (cardWidth - cardPadding * 2 - paneGap) / 2;
      const imageTop = top + 104;
      const imageHeight = 292;
      const [sample, drawing] = await Promise.all([
        load(attempt.sampleImage),
        load(mode === 'overlay' ? attempt.alignedDrawingSvg : attempt.drawingSvg),
      ]);

      context.fillStyle = '#fffef9';
      context.fillRect(left, top, cardWidth, cardHeight);
      context.strokeStyle = '#d9d6cc';
      context.lineWidth = 2;
      context.strokeRect(left, top, cardWidth, cardHeight);
      context.fillStyle = '#25261f';
      context.font = 'bold 22px sans-serif';
      context.fillText(`${index + 1}. ${attempt.prompt.shape}`, left + cardPadding, top + 32);
      context.fillStyle = '#686b60';
      context.font = '16px sans-serif';
      context.textAlign = 'right';
      context.fillText(
        `描画時間 ${attempt.seconds}秒・評価 ${attempt.evaluation.score}点`,
        left + cardWidth - cardPadding,
        top + 32,
      );
      context.textAlign = 'left';
      context.font = '15px sans-serif';
      context.fillText(formatEvaluationDetails(attempt.evaluation), left + cardPadding, top + 59);
      context.font = '16px sans-serif';
      if (mode === 'overlay') {
        const imageWidth = cardWidth - cardPadding * 2;
        context.fillText('見本＋描画（中心合わせ）', left + cardPadding, top + 88);
        context.fillStyle = '#ffffff';
        context.fillRect(left + cardPadding, imageTop, imageWidth, imageHeight);
        drawImageContained(context, sample, left + cardPadding, imageTop, imageWidth, imageHeight);
        context.save();
        context.globalAlpha = overlayOpacity;
        context.globalCompositeOperation = 'multiply';
        drawImageContained(context, drawing, left + cardPadding, imageTop, imageWidth, imageHeight);
        context.restore();
      } else {
        context.fillText('見本', left + cardPadding, top + 88);
        context.fillText('描いたもの', left + cardPadding + paneWidth + paneGap, top + 88);
        context.fillStyle = '#ffffff';
        context.fillRect(left + cardPadding, imageTop, paneWidth, imageHeight);
        context.fillRect(left + cardPadding + paneWidth + paneGap, imageTop, paneWidth, imageHeight);
        drawImageContained(context, sample, left + cardPadding, imageTop, paneWidth, imageHeight);
        drawImageContained(
          context,
          drawing,
          left + cardPadding + paneWidth + paneGap,
          imageTop,
          paneWidth,
          imageHeight,
        );
      }
    }

    downloadDataUrl(
      output.toDataURL('image/png'),
      `立体ドローイング_全結果_${mode === 'overlay' ? '重ね合わせ' : '横並び'}_${formatFileTimestamp()}.png`,
    );
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
        <section className="practice-section">
          <div className="practice-header">
            <div className="progress-area">
              <div className="progress-label"><strong>{questionIndex + 1} / {prompts.length}</strong><span>{currentPrompt.shape}</span></div>
              <div className="progress-track" role="progressbar" aria-valuemin={1} aria-valuemax={prompts.length} aria-valuenow={questionIndex + 1} aria-label="練習の進捗">
                <span style={{ width: `${((questionIndex + 1) / prompts.length) * 100}%` }} />
              </div>
            </div>
            <div className="timer" aria-live="polite"><small>{practiceSettings.time === null ? '経過時間' : '残り時間'}</small><strong>{formatTimerSeconds(practiceSettings.time === null ? elapsed : remaining)}</strong></div>
            <div className="practice-actions"><button className="button secondary compact" type="button" onClick={() => setPaused((value) => !value)}>{paused ? '再開' : '一時停止'}</button><button className="text-button danger" type="button" onClick={stopPractice}>終了</button></div>
          </div>

          <div className={practiceSettings.practiceMode === 'sample-only'
            ? 'workspace-layout sample-only-layout'
            : `workspace-layout layout-${practiceSettings.layout}`}>
            <section className="work-panel sample-panel">
              <div className="work-panel-header">
                <strong>見本</strong>
                <small>
                  {(practiceSettings.sampleStyle === 'shadow' && currentLight
                    ? `${practiceSettings.difficulty === 'hard' ? '難しい' : '簡単'}・光源 ${currentLight.label} ${currentLight.arrow}`
                    : practiceSettings.difficulty === 'hard'
                      ? '難しい・立体の向きもランダム'
                      : '簡単・見る方向はランダム')
                    + (practiceSettings.sampleVisibility === 'partway' ? '・途中で非表示' : '')}
                </small>
              </div>
              <div className="canvas-stage">
                <canvas
                  ref={sampleCanvasRef}
                  className={paused || sampleHiddenByMode ? 'sample-canvas hidden-sample' : 'sample-canvas'}
                  aria-label={`${currentPrompt.shape}の見本`}
                  aria-hidden={paused || sampleHiddenByMode}
                />
                {practiceSettings.sampleStyle === 'shadow' && currentLight && !paused && !sampleHiddenByMode && (
                  <span className="light-direction-badge">
                    光源 {currentLight.label} <b aria-hidden="true">{currentLight.arrow}</b>
                  </span>
                )}
                {practiceSettings.sampleVisibility === 'partway' && !paused && !sampleHiddenByMode && (
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
            {practiceSettings.practiceMode === 'canvas' && (
              <section className="work-panel drawing-panel">
              <div className="work-panel-header"><strong>描画スペース</strong><small>ペン・タッチ・マウス対応</small></div>
              <div className="canvas-stage">
                <canvas
                  ref={drawingCanvasRef}
                  className="drawing-canvas"
                  aria-label="描画キャンバス"
                  onPointerEnter={updateBrushCursor}
                  onPointerDown={beginStroke}
                  onPointerMove={continueStroke}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
                  onPointerLeave={hideBrushCursor}
                />
                <div
                  ref={brushCursorRef}
                  className={`brush-cursor ${tool}`}
                  style={{
                    width: brushCursorSize,
                    height: brushCursorSize,
                    borderColor: activeDrawingTool.cursorUsesPenColor
                      ? practiceSettings.penColor
                      : undefined,
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
                      onClick={() => setTool(drawingTool.id)}
                    >
                      {drawingTool.label}
                    </button>
                  ))}
                </div>
                <div className="drawing-style-controls">
                  <label className="toolbar-width-control">
                    <span>太さ</span>
                    <select
                      value={practiceSettings.penWidth}
                      onChange={(event) => updatePracticePenStyle({ penWidth: Number(event.target.value) })}
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
                      value={practiceSettings.stabilization}
                      onChange={(event) => updatePracticePenStyle({ stabilization: event.target.value as Stabilization })}
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
                      value={practiceSettings.penColor}
                      onChange={(event) => updatePracticePenStyle({ penColor: event.target.value })}
                      aria-label="練習中のペン色"
                    />
                  </label>
                  <label className="toolbar-opacity-control">
                    <span>濃さ {Math.round(practiceSettings.penOpacity * 100)}%</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={practiceSettings.penOpacity}
                      onChange={(event) => updatePracticePenStyle({ penOpacity: Number(event.target.value) })}
                      aria-label="練習中のペンの不透明度"
                    />
                  </label>
                </div>
                <div className="drawing-tool-group history-tools">
                  <button className="tool-button" type="button" disabled={!strokes.length} onClick={undo}>元に戻す</button>
                  <button className="tool-button" type="button" disabled={!redoStrokes.length} onClick={redo}>やり直す</button>
                  <button className="tool-button" type="button" disabled={!strokes.length} onClick={() => { setStrokes([]); setRedoStrokes([]); }}>全消去</button>
                </div>
              </div>
              </section>
            )}
          </div>
          <div className="practice-footer">
            <p>{practiceSettings.practiceMode === 'sample-only'
              ? practiceSettings.time === null
                ? '外部ソフトで描き終わったら「次の見本へ」を押します。'
                : '時間終了後、自動的に次の見本へ進みます。'
              : practiceSettings.time === null
                ? '描き終わったら「保存して次へ」を押します。'
                : '時間終了後、自動保存して次の問題へ進みます。'}</p>
            {practiceSettings.time === null && (
              <button className="button primary compact" type="button" onClick={() => finishCurrent(false)}>
                {practiceSettings.practiceMode === 'sample-only' ? '次の見本へ' : '保存して次へ'}
              </button>
            )}
          </div>
        </section>
      )}

      {screen === 'favorites' && (
        <section className="favorites-section">
          <div className="section-heading">
            <div><h2>お気に入り</h2><p>保存した見本を確認し、同じ立体でもう一度練習できます。</p></div>
            <button className="text-button" type="button" onClick={() => setScreen('home')}>トップへ戻る</button>
          </div>
          {selectedFavorite ? (
            <div className="favorite-layout">
              <nav className="favorite-list" aria-label="保存した見本">
                {favorites.map((favorite) => (
                  <button
                    key={favorite.id}
                    className={selectedFavorite.id === favorite.id ? 'favorite-item selected' : 'favorite-item'}
                    type="button"
                    aria-pressed={selectedFavorite.id === favorite.id}
                    onClick={() => setSelectedFavoriteId(favorite.id)}
                  >
                    <strong>★ {favorite.prompt.shape}</strong>
                    <span>{favorite.settings.difficulty === 'hard' ? '難しい' : '簡単'}・{favorite.settings.practiceMode === 'sample-only' ? '見本のみ' : 'サイト内描画'}・{favorite.settings.time === null ? '時間指定なし' : `${favorite.settings.time}秒`}</span>
                  </button>
                ))}
              </nav>
              <section className="favorite-preview-panel">
                <div className="favorite-preview-heading">
                  <div><p>保存した見本</p><h3>{selectedFavorite.prompt.shape}</h3></div>
                  <small>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date(selectedFavorite.createdAt))}に追加</small>
                </div>
                <div className="favorite-canvas-stage">
                  <canvas ref={favoriteCanvasRef} className="favorite-canvas" aria-label={`お気に入りの${selectedFavorite.prompt.shape}`} />
                  {selectedFavorite.settings.sampleStyle === 'shadow' && selectedFavoriteLight && (
                    <span className="light-direction-badge">
                      光源 {selectedFavoriteLight.label} <b aria-hidden="true">{selectedFavoriteLight.arrow}</b>
                    </span>
                  )}
                </div>
                <div className="favorite-meta">
                  <span><small>難易度</small><strong>{selectedFavorite.settings.difficulty === 'hard' ? '難しい' : '簡単'}</strong></span>
                  <span><small>練習方法</small><strong>{selectedFavorite.settings.practiceMode === 'sample-only' ? '見本のみ' : 'サイト内で描く'}</strong></span>
                  <span><small>見本表示</small><strong>{sampleStyleLabel(selectedFavorite.settings.sampleStyle)}</strong></span>
                  <span><small>表示時間</small><strong>{selectedFavorite.settings.sampleVisibility === 'partway' ? '途中で隠す' : '常に表示'}</strong></span>
                  <span><small>制限時間</small><strong>{selectedFavorite.settings.time === null ? '指定なし' : `${selectedFavorite.settings.time}秒`}</strong></span>
                </div>
                <div className="favorite-actions">
                  <button className="button primary" type="button" onClick={() => startFavoritePractice(selectedFavorite)}>この見本でもう一度</button>
                  <button className="text-button danger" type="button" onClick={deleteSelectedFavorite}>お気に入りから削除</button>
                </div>
              </section>
            </div>
          ) : (
            <div className="favorite-empty">
              <span aria-hidden="true">☆</span>
              <h3>お気に入りはまだありません</h3>
              <p>練習結果の比較画面から、気に入った見本を保存できます。</p>
              <button className="button primary" type="button" onClick={() => startPractice()}>練習を始める</button>
            </div>
          )}
        </section>
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
