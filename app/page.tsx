'use client';

/* eslint-disable @next/next/no-img-element -- comparison images are generated data URLs */

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { disposeSample3D, renderSample3D } from './three-sample';

type Screen = 'home' | 'settings' | 'practice' | 'results' | 'favorites';
type ShapeName = '立方体' | '直方体' | '円柱' | '楕円柱' | '三角錐' | '円錐';
type Layout = 'top' | 'bottom' | 'left' | 'right';
type Tool = 'pen' | 'guide' | 'eraser';
type SampleStyle = 'shaded' | 'shadow' | 'hidden-lines';
type LightDirection = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type Difficulty = 'easy' | 'hard';

type Point = { x: number; y: number };
type Stroke = {
  points: Point[];
  width: number;
  eraser: boolean;
  guide: boolean;
  color: string;
  opacity: number;
};
type ShapePrompt = {
  id: string;
  shape: ShapeName;
  widthScale: number;
  heightScale: number;
  depthScale: number;
  cameraAzimuth: number;
  cameraElevation: number;
  objectRotationX: number;
  objectRotationY: number;
  objectRotationZ: number;
  lightDirection: LightDirection;
};
type Attempt = {
  prompt: ShapePrompt;
  sampleImage: string;
  drawingImage: string;
  seconds: number;
};
type Settings = {
  shapes: ShapeName[];
  time: number | null;
  count: number;
  layout: Layout;
  penWidth: number;
  penColor: string;
  penOpacity: number;
  sampleStyle: SampleStyle;
  lightDirections: LightDirection[];
  difficulty: Difficulty;
};
type Favorite = {
  id: string;
  prompt: ShapePrompt;
  settings: Settings;
  createdAt: number;
};

const ALL_SHAPES: ShapeName[] = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'];
const TIME_CHOICES: Array<number | null> = [10, 15, 20, 30, 40, 45, 50, 60, null];
const LAYOUTS: Array<{ value: Layout; label: string }> = [
  { value: 'top', label: '見本が上' },
  { value: 'bottom', label: '見本が下' },
  { value: 'left', label: '見本が左' },
  { value: 'right', label: '見本が右' },
];
const LIGHT_DIRECTIONS: Array<{ value: LightDirection; label: string; arrow: string }> = [
  { value: 'top-left', label: '左上', arrow: '↘' },
  { value: 'top-right', label: '右上', arrow: '↙' },
  { value: 'bottom-left', label: '左下', arrow: '↗' },
  { value: 'bottom-right', label: '右下', arrow: '↖' },
];
const ALL_LIGHT_DIRECTIONS = LIGHT_DIRECTIONS.map(({ value }) => value);

const DEFAULT_SETTINGS: Settings = {
  shapes: [...ALL_SHAPES],
  time: 30,
  count: 10,
  layout: 'left',
  penWidth: 3,
  penColor: '#30322c',
  penOpacity: 1,
  sampleStyle: 'shaded',
  lightDirections: [...ALL_LIGHT_DIRECTIONS],
  difficulty: 'easy',
};

const freshDefaultSettings = (): Settings => ({
  ...DEFAULT_SETTINGS,
  shapes: [...ALL_SHAPES],
  lightDirections: [...ALL_LIGHT_DIRECTIONS],
});

function normalizeStoredSettings(parsed: Record<string, unknown>): Settings {
    const shapes = Array.isArray(parsed.shapes)
      ? parsed.shapes.filter((shape): shape is ShapeName => ALL_SHAPES.includes(shape as ShapeName))
      : [];
    const lightDirections = Array.isArray(parsed.lightDirections)
      ? parsed.lightDirections.filter((direction): direction is LightDirection => (
        ALL_LIGHT_DIRECTIONS.includes(direction as LightDirection)
      ))
      : [];
    const time = parsed.time === null
      || (typeof parsed.time === 'number' && TIME_CHOICES.includes(parsed.time))
      ? parsed.time as number | null
      : DEFAULT_SETTINGS.time;
    const count = typeof parsed.count === 'number' && Number.isFinite(parsed.count)
      ? Math.max(1, Math.min(20, Math.round(parsed.count)))
      : DEFAULT_SETTINGS.count;
    const layout = typeof parsed.layout === 'string'
      && LAYOUTS.some(({ value }) => value === parsed.layout)
      ? parsed.layout as Layout
      : DEFAULT_SETTINGS.layout;
    const penWidth = typeof parsed.penWidth === 'number' && [2, 3, 5].includes(parsed.penWidth)
      ? parsed.penWidth
      : DEFAULT_SETTINGS.penWidth;
    const penColor = typeof parsed.penColor === 'string' && /^#[0-9a-f]{6}$/i.test(parsed.penColor)
      ? parsed.penColor
      : DEFAULT_SETTINGS.penColor;
    const penOpacity = typeof parsed.penOpacity === 'number' && Number.isFinite(parsed.penOpacity)
      ? Math.max(0.1, Math.min(1, parsed.penOpacity))
      : DEFAULT_SETTINGS.penOpacity;
    const sampleStyle = parsed.sampleStyle === 'shadow' || parsed.sampleStyle === 'hidden-lines'
      ? parsed.sampleStyle
      : 'shaded';

  return {
    shapes: shapes.length ? shapes : [...ALL_SHAPES],
    time,
    count,
    layout,
    penWidth,
    penColor,
    penOpacity,
    sampleStyle,
    lightDirections: lightDirections.length ? lightDirections : [...ALL_LIGHT_DIRECTIONS],
    difficulty: parsed.difficulty === 'hard' ? 'hard' : 'easy',
  };
}

function readStoredSettings(): Settings {
  if (typeof window === 'undefined') return freshDefaultSettings();
  try {
    const saved = window.localStorage.getItem('solid-drawing-settings');
    if (!saved) return freshDefaultSettings();
    return normalizeStoredSettings(JSON.parse(saved) as Record<string, unknown>);
  } catch {
    try {
      window.localStorage.removeItem('solid-drawing-settings');
    } catch {
      // Storage may be unavailable in privacy-restricted browsing modes.
    }
    return freshDefaultSettings();
  }
}

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

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function createPrompts(
  shapes: ShapeName[],
  count: number,
  lightDirections: LightDirection[],
  difficulty: Difficulty,
): ShapePrompt[] {
  let previous: ShapeName | undefined;
  return Array.from({ length: count }, (_, index) => {
    const available = shapes.length > 1 ? shapes.filter((shape) => shape !== previous) : shapes;
    const shape = available[Math.floor(Math.random() * available.length)];
    const hardTilt = randomBetween(0.38, 1.02) * (Math.random() > 0.5 ? 1 : -1);
    previous = shape;
    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      shape,
      widthScale: randomBetween(0.82, 1.14),
      heightScale: randomBetween(0.84, 1.15),
      depthScale: randomBetween(0.78, 1.12),
      cameraAzimuth: randomBetween(-Math.PI, Math.PI),
      cameraElevation: randomBetween(0.24, 0.82),
      objectRotationX: difficulty === 'hard' ? hardTilt : 0,
      objectRotationY: difficulty === 'hard' ? randomBetween(-Math.PI, Math.PI) : 0,
      objectRotationZ: difficulty === 'hard' ? randomBetween(-0.55, 0.55) : 0,
      lightDirection: lightDirections[Math.floor(Math.random() * lightDirections.length)],
    };
  });
}

function drawSample(canvas: HTMLCanvasElement, prompt: ShapePrompt, background = '#ffffff', style: SampleStyle = 'shaded') {
  renderSample3D(canvas, prompt, style, background);
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
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

function strokeWidth(stroke: Stroke) {
  if (stroke.eraser) return stroke.width * 4;
  if (stroke.guide) return Math.max(1, stroke.width * 0.65);
  return stroke.width;
}

function strokeOpacity(stroke: Stroke) {
  if (stroke.eraser) return 1;
  if (stroke.guide) return Math.min(0.35, stroke.opacity * 0.4);
  return stroke.opacity;
}

function applyStrokeStyle(context: CanvasRenderingContext2D, stroke: Stroke) {
  context.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
  context.globalAlpha = strokeOpacity(stroke);
  context.strokeStyle = stroke.color;
  context.fillStyle = stroke.color;
  context.lineWidth = strokeWidth(stroke);
  context.lineCap = 'round';
  context.lineJoin = 'round';
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
  const [tool, setTool] = useState<Tool>('pen');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedResult, setSelectedResult] = useState(0);
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
  const currentLight = currentPrompt
    ? LIGHT_DIRECTIONS.find(({ value }) => value === currentPrompt.lightDirection)
    : undefined;
  const selectedFavoriteLight = selectedFavorite
    ? LIGHT_DIRECTIONS.find(({ value }) => value === selectedFavorite.prompt.lightDirection)
    : undefined;

  const sessionSeconds = useMemo(
    () => attempts.reduce((total, attempt) => total + attempt.seconds, 0),
    [attempts],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem('solid-drawing-settings', JSON.stringify(settings));
    } catch {
      // Continue with in-memory settings when browser storage is unavailable.
    }
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

  const exportDrawing = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return '';
    const output = document.createElement('canvas');
    output.width = canvas.width;
    output.height = canvas.height;
    const context = output.getContext('2d');
    if (!context) return '';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(canvas, 0, 0);
    return output.toDataURL('image/png');
  }, []);

  const finishCurrent = useCallback((endSession = false, timedOut = false) => {
    if (finishingRef.current || !currentPrompt || !sampleCanvasRef.current) return;
    finishingRef.current = true;
    const sampleImage = sampleCanvasRef.current.toDataURL('image/png');
    const drawingImage = exportDrawing();
    const pointerId = activePointerIdRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas && pointerId !== null && drawingCanvas.hasPointerCapture(pointerId)) {
      drawingCanvas.releasePointerCapture(pointerId);
    }
    activeStrokeRef.current = null;
    activePointerIdRef.current = null;
    const seconds = practiceSettings.time === null
      ? elapsedRef.current
      : timedOut
        ? practiceSettings.time
        : Math.max(1, practiceSettings.time - remainingRef.current);
    const nextAttempts = [...attempts, { prompt: currentPrompt, sampleImage, drawingImage, seconds }];
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
  }, [attempts, currentPrompt, exportDrawing, practiceSettings.time, prompts.length, questionIndex]);

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
        const nextElapsed = Math.floor(startingElapsed + (performance.now() - startedAt) / 1000);
        if (nextElapsed !== elapsedRef.current) {
          elapsedRef.current = nextElapsed;
          setElapsed(nextElapsed);
        }
      };
      timer = window.setInterval(tick, 100);
    } else {
      const deadline = startedAt + Math.max(0, remainingRef.current) * 1000;
      const tick = () => {
        const millisecondsLeft = deadline - performance.now();
        if (millisecondsLeft <= 0) {
          if (finished) return;
          finished = true;
          remainingRef.current = 0;
          setRemaining(0);
          if (timer !== undefined) window.clearInterval(timer);
          window.setTimeout(() => finishRef.current(false, true), 0);
          return;
        }
        const nextRemaining = Math.ceil(millisecondsLeft / 1000);
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

  const toggleShape = (shape: ShapeName) => {
    setSettings((current) => ({
      ...current,
      shapes: current.shapes.includes(shape)
        ? current.shapes.filter((item) => item !== shape)
        : [...current.shapes, shape],
    }));
    setValidation('');
  };

  const toggleLightDirection = (direction: LightDirection) => {
    setSettings((current) => ({
      ...current,
      lightDirections: current.lightDirections.includes(direction)
        ? current.lightDirections.filter((item) => item !== direction)
        : [...current.lightDirections, direction],
    }));
    setValidation('');
  };

  const updatePracticePenStyle = (patch: Partial<Pick<Settings, 'penColor' | 'penOpacity'>>) => {
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
    const normalized = { ...practiceSettings, count };
    setSettings(normalized);
    setSessionSettings(normalized);
    setPrompts(createPrompts(
      normalized.shapes,
      count,
      normalized.lightDirections.length ? normalized.lightDirections : ALL_LIGHT_DIRECTIONS,
      normalized.difficulty,
    ));
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
    activeStrokeRef.current = {
      points: [canvasPoint(event)],
      width: practiceSettings.penWidth,
      eraser: tool === 'eraser',
      guide: tool === 'guide',
      color: practiceSettings.penColor,
      opacity: practiceSettings.penOpacity,
    };
    setRedoStrokes([]);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    updateBrushCursor(event);
    const stroke = activeStrokeRef.current;
    const canvas = drawingCanvasRef.current;
    if (!stroke || !canvas || paused) return;
    const nextPoint = canvasPoint(event);
    const previousPoint = stroke.points[stroke.points.length - 1];
    stroke.points.push(nextPoint);
    const rect = canvas.getBoundingClientRect();
    const context = canvas.getContext('2d');
    if (!context) return;
    context.save();
    applyStrokeStyle(context, stroke);
    context.beginPath();
    context.moveTo(previousPoint.x * rect.width, previousPoint.y * rect.height);
    context.lineTo(nextPoint.x * rect.width, nextPoint.y * rect.height);
    context.stroke();
    context.restore();
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokeRef.current;
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
    if (window.confirm('ここまでの描画を保存して、比較画面へ移動しますか？')) finishCurrent(true);
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
    output.height = 720;
    const context = output.getContext('2d');
    if (!context) return;
    context.fillStyle = '#f1efe8';
    context.fillRect(0, 0, output.width, output.height);
    context.fillStyle = '#25261f';
    context.font = 'bold 32px sans-serif';
    context.fillText(`${selectedResult + 1}. ${currentResult.prompt.shape}`, 50, 56);
    context.font = '20px sans-serif';
    context.fillText('見本', 50, 108);
    context.fillText('描いたもの', 645, 108);

    const load = (source: string) => new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = source;
    });
    const [sample, drawing] = await Promise.all([load(currentResult.sampleImage), load(currentResult.drawingImage)]);
    context.fillStyle = '#ffffff';
    context.fillRect(50, 130, 545, 500);
    context.fillRect(645, 130, 545, 500);
    drawImageContained(context, sample, 50, 130, 545, 500);
    drawImageContained(context, drawing, 645, 130, 545, 500);
    context.fillStyle = '#686b60';
    context.font = '18px sans-serif';
    context.fillText(`描画時間 ${currentResult.seconds}秒`, 50, 680);
    downloadDataUrl(
      output.toDataURL('image/png'),
      `立体ドローイング_比較_${selectedResult + 1}_${currentResult.prompt.shape}_${formatFileTimestamp()}.png`,
    );
  };

  const saveDrawing = () => {
    if (!currentResult) return;
    downloadDataUrl(
      currentResult.drawingImage,
      `立体ドローイング_描画_${selectedResult + 1}_${currentResult.prompt.shape}_${formatFileTimestamp()}.png`,
    );
  };

  const saveAllComparisons = async () => {
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
    context.fillText(`${attempts.length}回分の見本と描画・2列表示`, outerPadding, 91);

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
      const imageTop = top + 82;
      const imageHeight = 292;
      const [sample, drawing] = await Promise.all([
        load(attempt.sampleImage),
        load(attempt.drawingImage),
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
      context.fillText(`描画時間 ${attempt.seconds}秒`, left + cardWidth - cardPadding, top + 32);
      context.textAlign = 'left';
      context.fillText('見本', left + cardPadding, top + 66);
      context.fillText('描いたもの', left + cardPadding + paneWidth + paneGap, top + 66);
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

    downloadDataUrl(
      output.toDataURL('image/png'),
      `立体ドローイング_全結果_${formatFileTimestamp()}.png`,
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
        <section className="settings-section">
          <div className="section-heading">
            <div><h2>練習の設定</h2><p>今日の練習内容を選びます。</p></div>
            <button className="text-button" type="button" onClick={() => setScreen('home')}>トップへ戻る</button>
          </div>
          <div className="settings-grid">
            <section className="settings-card wide-card">
              <h3>難易度</h3>
              <div className="difficulty-options">
                <button
                  className={settings.difficulty === 'easy' ? 'choice-button selected' : 'choice-button'}
                  type="button"
                  aria-pressed={settings.difficulty === 'easy'}
                  onClick={() => setSettings((current) => ({ ...current, difficulty: 'easy' }))}
                >
                  <strong>簡単</strong>
                  <small>現在と同じく、立体を直立させたまま見る方向を変えます</small>
                </button>
                <button
                  className={settings.difficulty === 'hard' ? 'choice-button selected' : 'choice-button'}
                  type="button"
                  aria-pressed={settings.difficulty === 'hard'}
                  onClick={() => setSettings((current) => ({ ...current, difficulty: 'hard' }))}
                >
                  <strong>難しい</strong>
                  <small>立体そのものを上下・左右・傾き方向へランダムに回転します</small>
                </button>
              </div>
            </section>
            <section className="settings-card">
              <h3>出題する立体</h3>
              <div className="shape-options">
                {ALL_SHAPES.map((shape) => (
                  <label key={shape} className="check-option">
                    <input type="checkbox" checked={settings.shapes.includes(shape)} onChange={() => toggleShape(shape)} />
                    {shape}
                  </label>
                ))}
              </div>
            </section>
            <section className="settings-card">
              <h3>1回の制限時間</h3>
              <div className="time-options">
                {TIME_CHOICES.map((time) => (
                  <button
                    key={time ?? 'none'}
                    className={settings.time === time ? 'choice-button selected' : 'choice-button'}
                    type="button"
                    aria-pressed={settings.time === time}
                    onClick={() => setSettings((current) => ({ ...current, time }))}
                  >
                    {time === null ? '指定なし' : `${time}秒`}
                  </button>
                ))}
              </div>
            </section>
            <section className="settings-card">
              <h3>回数と描画ツール</h3>
              <div className="field-grid">
                <label className="field-label">練習回数
                  <input type="number" min="1" max="20" value={settings.count} onChange={(event) => setSettings((current) => ({ ...current, count: Number(event.target.value) }))} />
                  <small>1〜20回</small>
                </label>
                <label className="field-label">線の太さ
                  <select value={settings.penWidth} onChange={(event) => setSettings((current) => ({ ...current, penWidth: Number(event.target.value) }))}>
                    <option value="2">細い</option><option value="3">普通</option><option value="5">太い</option>
                  </select>
                </label>
                <label className="field-label">ペン色
                  <span className="color-setting">
                    <input
                      type="color"
                      value={settings.penColor}
                      onChange={(event) => setSettings((current) => ({ ...current, penColor: event.target.value }))}
                      aria-label="ペン色"
                    />
                    <span>{settings.penColor.toUpperCase()}</span>
                  </span>
                </label>
                <label className="field-label">ペンの不透明度
                  <span className="opacity-setting">
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.penOpacity}
                      onChange={(event) => setSettings((current) => ({ ...current, penOpacity: Number(event.target.value) }))}
                      aria-label="ペンの不透明度"
                    />
                    <output>{Math.round(settings.penOpacity * 100)}%</output>
                  </span>
                </label>
              </div>
              <p className="setting-note">補助線は、選んだペン色を使って通常より細く薄く描画します。</p>
            </section>
            <section className="settings-card">
              <h3>見本の表示</h3>
              <div className="sample-style-options">
                <button
                  className={settings.sampleStyle === 'shaded' ? 'choice-button selected' : 'choice-button'}
                  type="button"
                  aria-pressed={settings.sampleStyle === 'shaded'}
                  onClick={() => setSettings((current) => ({ ...current, sampleStyle: 'shaded' }))}
                >輪郭線と薄い陰影</button>
                <button
                  className={settings.sampleStyle === 'shadow' ? 'choice-button selected' : 'choice-button'}
                  type="button"
                  aria-pressed={settings.sampleStyle === 'shadow'}
                  onClick={() => setSettings((current) => ({ ...current, sampleStyle: 'shadow' }))}
                >輪郭線と影</button>
                <button
                  className={settings.sampleStyle === 'hidden-lines' ? 'choice-button selected' : 'choice-button'}
                  type="button"
                  aria-pressed={settings.sampleStyle === 'hidden-lines'}
                  onClick={() => setSettings((current) => ({ ...current, sampleStyle: 'hidden-lines' }))}
                >輪郭線（見えない部分は点線）</button>
              </div>
              {settings.sampleStyle === 'shadow' && (
                <fieldset className="light-direction-fieldset">
                  <legend>使用する光源方向</legend>
                  <div className="light-direction-options">
                    {LIGHT_DIRECTIONS.map((direction) => (
                      <label className="check-option" key={direction.value}>
                        <input
                          type="checkbox"
                          checked={settings.lightDirections.includes(direction.value)}
                          onChange={() => toggleLightDirection(direction.value)}
                        />
                        <span>{direction.label} <b aria-hidden="true">{direction.arrow}</b></span>
                      </label>
                    ))}
                  </div>
                  <p className="setting-note">選んだ方向の中から、問題ごとに光源をランダム設定します。</p>
                </fieldset>
              )}
              <p className="setting-note">問題ごとに3Dカメラの方向と比率をランダム生成</p>
            </section>
            <section className="settings-card wide-card">
              <h3>見本と描画スペースの配置</h3>
              <div className="layout-options">
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout.value}
                    className={settings.layout === layout.value ? 'layout-choice selected' : 'layout-choice'}
                    type="button"
                    aria-pressed={settings.layout === layout.value}
                    onClick={() => setSettings((current) => ({ ...current, layout: layout.value }))}
                  >
                    <span className={`layout-mini ${layout.value}`} aria-hidden="true"><i /><i /></span>
                    <span>{layout.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
          {validation && <p className="validation-message" role="alert">{validation}</p>}
          <div className="settings-footer"><button className="button primary" type="button" onClick={() => startPractice()}>この設定で始める</button></div>
        </section>
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
            <div className="timer" aria-live="polite"><small>{practiceSettings.time === null ? '経過時間' : '残り時間'}</small><strong>{formatTime(practiceSettings.time === null ? elapsed : remaining)}</strong></div>
            <div className="practice-actions"><button className="button secondary compact" type="button" onClick={() => setPaused((value) => !value)}>{paused ? '再開' : '一時停止'}</button><button className="text-button danger" type="button" onClick={stopPractice}>終了</button></div>
          </div>

          <div className={`workspace-layout layout-${practiceSettings.layout}`}>
            <section className="work-panel sample-panel">
              <div className="work-panel-header">
                <strong>見本</strong>
                <small>
                  {practiceSettings.sampleStyle === 'shadow' && currentLight
                    ? `${practiceSettings.difficulty === 'hard' ? '難しい' : '簡単'}・光源 ${currentLight.label} ${currentLight.arrow}`
                    : practiceSettings.difficulty === 'hard'
                      ? '難しい・立体の向きもランダム'
                      : '簡単・見る方向はランダム'}
                </small>
              </div>
              <div className="canvas-stage">
                <canvas ref={sampleCanvasRef} className={paused ? 'sample-canvas hidden-sample' : 'sample-canvas'} aria-label={`${currentPrompt.shape}の見本`} />
                {practiceSettings.sampleStyle === 'shadow' && currentLight && !paused && (
                  <span className="light-direction-badge">
                    光源 {currentLight.label} <b aria-hidden="true">{currentLight.arrow}</b>
                  </span>
                )}
                {paused && <div className="pause-cover"><strong>一時停止中</strong><span>再開すると見本を表示します</span></div>}
              </div>
            </section>
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
                    width: tool === 'eraser'
                      ? practiceSettings.penWidth * 4
                      : tool === 'guide'
                        ? Math.max(1, practiceSettings.penWidth * 0.65)
                        : practiceSettings.penWidth,
                    height: tool === 'eraser'
                      ? practiceSettings.penWidth * 4
                      : tool === 'guide'
                        ? Math.max(1, practiceSettings.penWidth * 0.65)
                        : practiceSettings.penWidth,
                    borderColor: tool === 'eraser' ? undefined : practiceSettings.penColor,
                  }}
                  aria-hidden="true"
                />
                {paused && <div className="drawing-pause-shield" aria-hidden="true" />}
              </div>
              <div className="drawing-toolbar" aria-label="描画ツール">
                <div className="drawing-tool-group">
                  <button className={tool === 'pen' ? 'tool-button selected' : 'tool-button'} type="button" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}>ペン</button>
                  <button className={tool === 'guide' ? 'tool-button selected' : 'tool-button'} type="button" aria-pressed={tool === 'guide'} onClick={() => setTool('guide')}>補助線</button>
                  <button className={tool === 'eraser' ? 'tool-button selected' : 'tool-button'} type="button" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>消しゴム</button>
                </div>
                <div className="drawing-style-controls">
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
          </div>
          <div className="practice-footer">
            <p>{practiceSettings.time === null ? '描き終わったら「保存して次へ」を押します。' : '時間終了後、自動保存して次の問題へ進みます。'}</p>
            {practiceSettings.time === null && <button className="button primary compact" type="button" onClick={() => finishCurrent(false)}>保存して次へ</button>}
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
                    <span>{favorite.settings.difficulty === 'hard' ? '難しい' : '簡単'}・{favorite.settings.time === null ? '時間指定なし' : `${favorite.settings.time}秒`}</span>
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
                  <span><small>見本表示</small><strong>{sampleStyleLabel(selectedFavorite.settings.sampleStyle)}</strong></span>
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
        <section className="results-section">
          <div className="results-heading">
            <div><h2>練習結果</h2><div className="result-meta"><span>{attempts.length}回完了</span><span>合計 {formatTime(sessionSeconds)}</span><span>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date())}</span></div></div>
            <div className="button-row">
              <button className="button secondary" type="button" onClick={retryCurrentPrompt}>今回と同じ立体でもう一度</button>
              <button className="button primary" type="button" onClick={() => startPractice(sessionSettings ?? settings)}>同じ設定でもう一度</button>
            </div>
          </div>
          <div className="result-layout">
            <nav className="result-list" aria-label="比較する問題">
              {attempts.map((attempt, index) => (
                <button key={attempt.prompt.id} className={selectedResult === index ? 'result-item selected' : 'result-item'} type="button" aria-pressed={selectedResult === index} onClick={() => setSelectedResult(index)}>
                  <strong>{index + 1}　{attempt.prompt.shape}</strong><span>{attempt.seconds}秒</span>
                </button>
              ))}
            </nav>
            {currentResult && (
              <section className="comparison-panel">
                <div className="comparison-heading"><h3>{selectedResult + 1}　{currentResult.prompt.shape}</h3><span>見本と描画を横並びで比較</span></div>
                <div className="comparison-panes">
                  <figure className="compare-pane"><figcaption>見本</figcaption><div><img src={currentResult.sampleImage} alt={`${currentResult.prompt.shape}の見本`} /></div></figure>
                  <figure className="compare-pane"><figcaption>描いたもの</figcaption><div><img src={currentResult.drawingImage} alt={`${currentResult.prompt.shape}を描いた結果`} /></div></figure>
                </div>
                <div className="comparison-footer">
                  <div className="button-row"><button className={isCurrentFavorite ? 'button favorite selected compact' : 'button favorite compact'} type="button" aria-pressed={isCurrentFavorite} onClick={toggleCurrentFavorite}>{isCurrentFavorite ? '★ お気に入り済み' : '☆ お気に入りに追加'}</button><button className="button secondary compact" type="button" onClick={saveComparison}>比較画像を保存</button><button className="button secondary compact" type="button" onClick={saveDrawing}>描画だけ保存</button><button className="button primary compact" type="button" onClick={saveAllComparisons}>全結果を2列で保存</button></div>
                  <div className="button-row"><button className="button secondary compact" type="button" disabled={selectedResult === 0} onClick={() => setSelectedResult((index) => index - 1)}>前へ</button><button className="button secondary compact" type="button" disabled={selectedResult === attempts.length - 1} onClick={() => setSelectedResult((index) => index + 1)}>次へ</button></div>
                </div>
              </section>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
