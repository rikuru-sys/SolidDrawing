'use client';

import {
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type Screen = 'home' | 'settings' | 'practice' | 'results';
type ShapeName = '立方体' | '直方体' | '円柱' | '楕円柱' | '三角錐' | '円錐';
type Layout = 'top' | 'bottom' | 'left' | 'right';
type Tool = 'pen' | 'eraser';
type SampleStyle = 'shaded' | 'shadow' | 'hidden-lines';
type LightDirection = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type Point = { x: number; y: number };
type Stroke = { points: Point[]; width: number; eraser: boolean };
type ShapePrompt = {
  id: string;
  shape: ShapeName;
  rotation: number;
  direction: 1 | -1;
  widthScale: number;
  heightScale: number;
  depthScale: number;
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
  sampleStyle: SampleStyle;
  lightDirections: LightDirection[];
};

const ALL_SHAPES: ShapeName[] = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'];
const TIME_CHOICES: Array<number | null> = [10, 15, 20, 30, 40, 45, 50, 60, null];
const LIGHT_DIRECTIONS: Array<{ value: LightDirection; label: string }> = [
  { value: 'top-left', label: '左上' },
  { value: 'top-right', label: '右上' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-right', label: '右下' },
];
const ALL_LIGHT_DIRECTIONS = LIGHT_DIRECTIONS.map(({ value }) => value);
const LAYOUTS: Array<{ value: Layout; label: string }> = [
  { value: 'top', label: '見本が上' },
  { value: 'bottom', label: '見本が下' },
  { value: 'left', label: '見本が左' },
  { value: 'right', label: '見本が右' },
];

const DEFAULT_SETTINGS: Settings = {
  shapes: [...ALL_SHAPES],
  time: 30,
  count: 10,
  layout: 'left',
  penWidth: 3,
  sampleStyle: 'shaded',
  lightDirections: [...ALL_LIGHT_DIRECTIONS],
};

const HERO_PROMPT: ShapePrompt = {
  id: 'hero-cube',
  shape: '立方体',
  rotation: -0.08,
  direction: 1,
  widthScale: 1,
  heightScale: 1,
  depthScale: 1,
  lightDirection: 'top-left',
};

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function createPrompts(shapes: ShapeName[], count: number, lightDirections: LightDirection[]): ShapePrompt[] {
  let previous: ShapeName | undefined;
  return Array.from({ length: count }, (_, index) => {
    const available = shapes.length > 1 ? shapes.filter((shape) => shape !== previous) : shapes;
    const shape = available[Math.floor(Math.random() * available.length)];
    previous = shape;
    return {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      shape,
      rotation: randomBetween(-0.25, 0.25),
      direction: Math.random() > 0.5 ? 1 : -1,
      widthScale: randomBetween(0.82, 1.14),
      heightScale: randomBetween(0.84, 1.15),
      depthScale: randomBetween(0.78, 1.12),
      lightDirection: lightDirections[Math.floor(Math.random() * lightDirections.length)],
    };
  });
}

function polygon(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: string,
) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => context.lineTo(x, y));
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.stroke();
}

function drawBox(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number, light?: LightDirection) {
  const cube = prompt.shape === '立方体';
  const width = size * (cube ? 0.54 : 0.66 * prompt.widthScale);
  const height = size * (cube ? 0.5 : 0.43 * prompt.heightScale);
  const depth = size * (cube ? 0.23 : 0.25 * prompt.depthScale);
  const direction = prompt.direction;
  const x = -width / 2;
  const y = -height / 2 + depth * 0.18;
  const dx = direction * depth;
  const dy = -depth * 0.52;

  const lightFromTop = light?.startsWith('top') ?? true;
  const lightFromRight = light?.endsWith('right') ?? false;
  const visibleSideIsLit = prompt.direction > 0 ? lightFromRight : !lightFromRight;
  const frontFill = light ? (lightFromTop ? '#e5e2d7' : '#c7c3b8') : '#e9e6dc';
  const topFill = light ? (lightFromTop ? '#fffdf6' : '#c6c2b7') : '#f5f3ec';
  const sideFill = light ? (visibleSideIsLit ? '#ddd9ce' : '#9e9a90') : '#c9c6bc';

  polygon(context, [[x, y], [x + width, y], [x + width, y + height], [x, y + height]], frontFill);
  polygon(context, [[x, y], [x + dx, y + dy], [x + width + dx, y + dy], [x + width, y]], topFill);
  const sidePoints: Array<[number, number]> = direction > 0
    ? [[x + width, y], [x + width + dx, y + dy], [x + width + dx, y + height + dy], [x + width, y + height]]
    : [[x, y], [x + dx, y + dy], [x + dx, y + height + dy], [x, y + height]];
  polygon(context, sidePoints, sideFill);
}

function drawCylinder(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number, light?: LightDirection) {
  const elliptical = prompt.shape === '楕円柱';
  const width = size * (elliptical ? 0.66 : 0.54) * prompt.widthScale;
  const height = size * (elliptical ? 0.46 : 0.58) * prompt.heightScale;
  const ellipseHeight = size * (elliptical ? 0.17 : 0.12) * prompt.depthScale;
  const topY = -height / 2;
  const bottomY = height / 2;
  const gradient = context.createLinearGradient(-width / 2, 0, width / 2, 0);
  const highlight = light?.endsWith('right') ? 0.72 : light ? 0.28 : 0.45;
  gradient.addColorStop(0, light ? '#aaa69c' : '#c8c5bb');
  gradient.addColorStop(highlight, light ? '#f7f4ea' : '#f0ede4');
  gradient.addColorStop(1, light ? '#aaa69c' : '#d5d2c8');

  context.beginPath();
  context.moveTo(-width / 2, topY);
  context.lineTo(-width / 2, bottomY);
  context.bezierCurveTo(-width / 2, bottomY + ellipseHeight * 0.68, width / 2, bottomY + ellipseHeight * 0.68, width / 2, bottomY);
  context.lineTo(width / 2, topY);
  context.fillStyle = gradient;
  context.fill();
  context.stroke();

  context.beginPath();
  context.ellipse(0, topY, width / 2, ellipseHeight / 2, 0, 0, Math.PI * 2);
  context.fillStyle = light ? (light.startsWith('top') ? '#fffdf6' : '#c8c4b9') : '#f5f3ec';
  context.fill();
  context.stroke();

  context.beginPath();
  context.ellipse(0, bottomY, width / 2, ellipseHeight / 2, 0, 0, Math.PI);
  context.stroke();
}

function drawPyramid(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number, light?: LightDirection) {
  const direction = prompt.direction;
  const baseWidth = size * 0.63 * prompt.widthScale;
  const baseY = size * 0.25;
  const backY = size * 0.05;
  const apexX = direction * size * 0.09;
  const apexY = -size * 0.39 * prompt.heightScale;
  const left: [number, number] = [-baseWidth / 2, baseY];
  const right: [number, number] = [baseWidth / 2, baseY];
  const back: [number, number] = [direction * size * 0.13, backY];
  const apex: [number, number] = [apexX, apexY];
  const lightFromRight = light?.endsWith('right') ?? false;
  const sideIsLit = direction > 0 ? lightFromRight : !lightFromRight;
  polygon(context, [left, right, apex], light ? (light.startsWith('top') ? '#e7e3d8' : '#c2beb3') : '#e5e2d8');
  polygon(context, direction > 0 ? [right, back, apex] : [left, back, apex], light ? (sideIsLit ? '#ded9ce' : '#99958c') : '#c7c4ba');
  context.beginPath();
  context.moveTo(left[0], left[1]);
  context.lineTo(back[0], back[1]);
  context.lineTo(right[0], right[1]);
  context.stroke();
}

function drawCone(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number, light?: LightDirection) {
  const width = size * 0.62 * prompt.widthScale;
  const ellipseHeight = size * 0.15 * prompt.depthScale;
  const baseY = size * 0.27;
  const apexX = prompt.direction * size * 0.08;
  const apexY = -size * 0.4 * prompt.heightScale;
  const gradient = context.createLinearGradient(-width / 2, 0, width / 2, 0);
  const highlight = light?.endsWith('right') ? 0.72 : light ? 0.28 : 0.52;
  gradient.addColorStop(0, light ? '#aaa69c' : '#c7c4ba');
  gradient.addColorStop(highlight, light ? '#f8f5ec' : '#efede5');
  gradient.addColorStop(1, light ? '#aaa69c' : '#d3d0c7');

  context.beginPath();
  context.moveTo(apexX, apexY);
  context.lineTo(-width / 2, baseY);
  context.bezierCurveTo(-width / 2, baseY + ellipseHeight * 0.72, width / 2, baseY + ellipseHeight * 0.72, width / 2, baseY);
  context.closePath();
  context.fillStyle = gradient;
  context.fill();
  context.stroke();

  context.beginPath();
  context.ellipse(0, baseY, width / 2, ellipseHeight / 2, 0, 0, Math.PI);
  context.stroke();
}

function strokeEdge(
  context: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
  dashed = false,
) {
  context.save();
  context.setLineDash(dashed ? [8, 7] : []);
  context.beginPath();
  context.moveTo(from[0], from[1]);
  context.lineTo(to[0], to[1]);
  context.stroke();
  context.restore();
}

function drawHiddenLineBox(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number) {
  const cube = prompt.shape === '立方体';
  const width = size * (cube ? 0.54 : 0.66 * prompt.widthScale);
  const height = size * (cube ? 0.5 : 0.43 * prompt.heightScale);
  const depth = size * (cube ? 0.23 : 0.25 * prompt.depthScale);
  const x = -width / 2;
  const y = -height / 2 + depth * 0.18;
  const dx = prompt.direction * depth;
  const dy = -depth * 0.52;
  const a: [number, number] = [x, y];
  const b: [number, number] = [x + width, y];
  const c: [number, number] = [x + width, y + height];
  const d: [number, number] = [x, y + height];
  const back = ([px, py]: [number, number]): [number, number] => [px + dx, py + dy];
  const aa = back(a);
  const bb = back(b);
  const cc = back(c);
  const dd = back(d);

  [[a, b], [b, c], [c, d], [d, a], [a, aa], [b, bb], [aa, bb]].forEach(([from, to]) => strokeEdge(context, from, to));
  if (prompt.direction > 0) {
    [[bb, cc], [cc, c]].forEach(([from, to]) => strokeEdge(context, from, to));
    [[aa, dd], [dd, cc], [d, dd]].forEach(([from, to]) => strokeEdge(context, from, to, true));
  } else {
    [[aa, dd], [dd, d]].forEach(([from, to]) => strokeEdge(context, from, to));
    [[bb, cc], [dd, cc], [c, cc]].forEach(([from, to]) => strokeEdge(context, from, to, true));
  }
}

function drawHiddenLineRound(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number) {
  const isCone = prompt.shape === '円錐';
  const elliptical = prompt.shape === '楕円柱';
  const width = size * (isCone ? 0.62 : elliptical ? 0.66 : 0.54) * prompt.widthScale;
  const ellipseHeight = size * (isCone ? 0.15 : elliptical ? 0.17 : 0.12) * prompt.depthScale;
  const baseY = size * (isCone ? 0.27 : (elliptical ? 0.46 : 0.58) * prompt.heightScale / 2);

  if (isCone) {
    const apex: [number, number] = [prompt.direction * size * 0.08, -size * 0.4 * prompt.heightScale];
    strokeEdge(context, apex, [-width / 2, baseY]);
    strokeEdge(context, apex, [width / 2, baseY]);
  } else {
    const topY = -baseY;
    strokeEdge(context, [-width / 2, topY], [-width / 2, baseY]);
    strokeEdge(context, [width / 2, topY], [width / 2, baseY]);
    context.beginPath();
    context.ellipse(0, topY, width / 2, ellipseHeight / 2, 0, 0, Math.PI * 2);
    context.stroke();
  }

  context.beginPath();
  context.ellipse(0, baseY, width / 2, ellipseHeight / 2, 0, 0, Math.PI);
  context.stroke();
  context.save();
  context.setLineDash([8, 7]);
  context.beginPath();
  context.ellipse(0, baseY, width / 2, ellipseHeight / 2, 0, Math.PI, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawHiddenLinePyramid(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number) {
  const baseWidth = size * 0.63 * prompt.widthScale;
  const left: [number, number] = [-baseWidth / 2, size * 0.25];
  const right: [number, number] = [baseWidth / 2, size * 0.25];
  const back: [number, number] = [prompt.direction * size * 0.13, size * 0.05];
  const apex: [number, number] = [prompt.direction * size * 0.09, -size * 0.39 * prompt.heightScale];
  [[apex, left], [apex, right], [apex, back], [left, right]].forEach(([from, to]) => strokeEdge(context, from, to));
  if (prompt.direction > 0) {
    strokeEdge(context, back, right);
    strokeEdge(context, left, back, true);
  } else {
    strokeEdge(context, left, back);
    strokeEdge(context, back, right, true);
  }
}

function drawCastShadow(
  context: CanvasRenderingContext2D,
  centerX: number,
  groundY: number,
  size: number,
  prompt: ShapePrompt,
) {
  const castDirection = prompt.lightDirection.endsWith('left') ? 1 : -1;
  const castLength = size * (prompt.lightDirection.startsWith('top') ? 0.48 : 0.34);
  const castX = castDirection * castLength;
  const rise = size * 0.075;

  context.save();
  context.filter = 'blur(3px)';
  context.fillStyle = 'rgba(54, 55, 48, 0.32)';
  context.beginPath();

  if (prompt.shape === '立方体' || prompt.shape === '直方体') {
    const cube = prompt.shape === '立方体';
    const halfWidth = size * (cube ? 0.27 : 0.33 * prompt.widthScale);
    context.moveTo(centerX - halfWidth, groundY - 2);
    context.lineTo(centerX + halfWidth, groundY - 2);
    context.lineTo(centerX + halfWidth + castX, groundY - rise);
    context.lineTo(centerX - halfWidth + castX, groundY - rise);
    context.closePath();
  } else if (prompt.shape === '円柱' || prompt.shape === '楕円柱') {
    const elliptical = prompt.shape === '楕円柱';
    const bodyWidth = size * (elliptical ? 0.66 : 0.54) * prompt.widthScale;
    const shadowCenterX = centerX + castX * 0.55;
    const radiusX = Math.abs(castX) * 0.55 + bodyWidth * 0.34;
    context.ellipse(shadowCenterX, groundY - rise * 0.45, radiusX, size * 0.065, castDirection * -0.1, 0, Math.PI * 2);
  } else if (prompt.shape === '三角錐') {
    const halfBase = size * 0.315 * prompt.widthScale;
    context.moveTo(centerX - halfBase, groundY - 2);
    context.lineTo(centerX + halfBase, groundY - 2);
    context.lineTo(centerX + castX, groundY - rise * 1.15);
    context.closePath();
  } else {
    const halfBase = size * 0.31 * prompt.widthScale;
    context.moveTo(centerX - halfBase, groundY - 2);
    context.quadraticCurveTo(centerX, groundY + size * 0.035, centerX + halfBase, groundY - 2);
    context.lineTo(centerX + castX, groundY - rise * 1.25);
    context.closePath();
  }

  context.fill();
  context.restore();
}

function drawLightingGuide(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  size: number,
  prompt: ShapePrompt,
) {
  const direction = prompt.lightDirection;
  const lightFromLeft = direction.endsWith('left');
  const lightFromTop = direction.startsWith('top');
  let groundOffset = 0.27;
  if (prompt.shape === '直方体') groundOffset = 0.215 * prompt.heightScale + 0.045 * prompt.depthScale;
  if (prompt.shape === '円柱') groundOffset = 0.29 * prompt.heightScale + 0.04 * prompt.depthScale;
  if (prompt.shape === '楕円柱') groundOffset = 0.23 * prompt.heightScale + 0.058 * prompt.depthScale;
  if (prompt.shape === '円錐') groundOffset = 0.27 + 0.05 * prompt.depthScale;
  const groundY = Math.min(height - 28, height / 2 + size * groundOffset);
  const sourceX = lightFromLeft ? width * 0.1 : width * 0.9;
  const sourceY = lightFromTop ? Math.max(24, height * 0.14) : height - 24;
  const targetX = width / 2 + (lightFromLeft ? -1 : 1) * size * 0.08;
  const targetY = height / 2 - size * 0.05;
  drawCastShadow(context, width / 2, groundY, size, prompt);

  context.save();
  context.strokeStyle = '#77796f';
  context.lineWidth = 1.6;
  context.beginPath();
  context.moveTo(width * 0.08, groundY);
  context.lineTo(width * 0.92, groundY);
  context.stroke();

  context.strokeStyle = '#b78324';
  context.fillStyle = '#f2bd4b';
  context.lineWidth = 2;
  context.setLineDash([7, 6]);
  context.beginPath();
  context.moveTo(sourceX, sourceY);
  context.lineTo(targetX, targetY);
  context.stroke();
  context.setLineDash([]);

  const angle = Math.atan2(targetY - sourceY, targetX - sourceX);
  context.beginPath();
  context.moveTo(targetX, targetY);
  context.lineTo(targetX - Math.cos(angle - 0.5) * 11, targetY - Math.sin(angle - 0.5) * 11);
  context.lineTo(targetX - Math.cos(angle + 0.5) * 11, targetY - Math.sin(angle + 0.5) * 11);
  context.closePath();
  context.fillStyle = '#b78324';
  context.fill();

  const lightRadius = Math.max(8, Math.min(12, height * 0.035));
  context.fillStyle = '#f5c45b';
  context.strokeStyle = '#a87016';
  context.lineWidth = 1.8;
  context.beginPath();
  context.arc(sourceX, sourceY, lightRadius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  for (let index = 0; index < 8; index += 1) {
    const rayAngle = index * Math.PI / 4;
    context.beginPath();
    context.moveTo(sourceX + Math.cos(rayAngle) * (lightRadius + 3), sourceY + Math.sin(rayAngle) * (lightRadius + 3));
    context.lineTo(sourceX + Math.cos(rayAngle) * (lightRadius + 8), sourceY + Math.sin(rayAngle) * (lightRadius + 8));
    context.stroke();
  }
  context.restore();
}

function drawSample(canvas: HTMLCanvasElement, prompt: ShapePrompt, background = '#ffffff', style: SampleStyle = 'shaded') {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = background;
  context.fillRect(0, 0, rect.width, rect.height);
  const size = Math.min(rect.width, rect.height) * 0.76;
  if (style === 'shadow') drawLightingGuide(context, rect.width, rect.height, size, prompt);
  context.save();
  context.translate(rect.width / 2, rect.height / 2);
  context.rotate(prompt.rotation);
  context.strokeStyle = '#353730';
  context.lineWidth = 2.25;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  if (style === 'hidden-lines') {
    if (prompt.shape === '立方体' || prompt.shape === '直方体') drawHiddenLineBox(context, prompt, size);
    if (prompt.shape === '円柱' || prompt.shape === '楕円柱' || prompt.shape === '円錐') drawHiddenLineRound(context, prompt, size);
    if (prompt.shape === '三角錐') drawHiddenLinePyramid(context, prompt, size);
  } else {
    if (style === 'shadow') {
      context.filter = 'contrast(1.18)';
    }
    const light = style === 'shadow' ? prompt.lightDirection : undefined;
    if (prompt.shape === '立方体' || prompt.shape === '直方体') drawBox(context, prompt, size, light);
    if (prompt.shape === '円柱' || prompt.shape === '楕円柱') drawCylinder(context, prompt, size, light);
    if (prompt.shape === '三角錐') drawPyramid(context, prompt, size, light);
    if (prompt.shape === '円錐') drawCone(context, prompt, size, light);
  }
  context.restore();
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
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

  const heroCanvasRef = useRef<HTMLCanvasElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushCursorRef = useRef<HTMLDivElement>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const finishingRef = useRef(false);
  const finishRef = useRef<(endSession?: boolean, timedOut?: boolean) => void>(() => undefined);

  const currentPrompt = prompts[questionIndex];
  const currentResult = attempts[selectedResult];

  const sessionSeconds = useMemo(
    () => attempts.reduce((total, attempt) => total + attempt.seconds, 0),
    [attempts],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem('solid-drawing-settings');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<Settings>;
      setSettings({
        ...DEFAULT_SETTINGS,
        ...parsed,
        shapes: parsed.shapes?.length ? parsed.shapes : ALL_SHAPES,
        lightDirections: parsed.lightDirections?.length ? parsed.lightDirections : ALL_LIGHT_DIRECTIONS,
      });
    } catch {
      window.localStorage.removeItem('solid-drawing-settings');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('solid-drawing-settings', JSON.stringify(settings));
  }, [settings]);

  const paintStroke = useCallback((context: CanvasRenderingContext2D, stroke: Stroke, width: number, height: number) => {
    if (!stroke.points.length) return;
    context.save();
    context.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
    context.strokeStyle = '#30322c';
    context.fillStyle = '#30322c';
    context.lineWidth = stroke.eraser ? stroke.width * 4 : stroke.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
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
    return () => observer.disconnect();
  }, [screen]);

  useEffect(() => {
    if (screen !== 'practice' || !currentPrompt || !sampleCanvasRef.current) return;
    const canvas = sampleCanvasRef.current;
    const render = () => drawSample(canvas, currentPrompt, '#ffffff', settings.sampleStyle);
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [currentPrompt, screen, settings.sampleStyle]);

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
    const seconds = settings.time === null
      ? elapsed
      : timedOut
        ? settings.time
        : Math.max(1, settings.time - remaining);
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
    setRemaining(settings.time ?? 0);
    setElapsed(0);
    setStrokes([]);
    setRedoStrokes([]);
    setPaused(false);
    window.setTimeout(() => { finishingRef.current = false; }, 0);
  }, [attempts, currentPrompt, elapsed, exportDrawing, prompts.length, questionIndex, remaining, settings.time]);

  useEffect(() => {
    finishRef.current = finishCurrent;
  }, [finishCurrent]);

  useEffect(() => {
    if (screen !== 'practice' || paused) return;
    if (settings.time === null) {
      const elapsedTimer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
      return () => window.clearInterval(elapsedTimer);
    }
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          window.setTimeout(() => finishRef.current(false, true), 0);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused, questionIndex, screen, settings.time]);

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

  const startPractice = (practiceSettings: Settings = settings) => {
    const count = Math.max(1, Math.min(20, Number(practiceSettings.count) || 1));
    if (!practiceSettings.shapes.length) {
      setValidation('少なくとも1つの立体を選んでください。');
      return;
    }
    if (practiceSettings.sampleStyle === 'shadow' && !practiceSettings.lightDirections.length) {
      setValidation('「輪郭線と影」では、光源の向きを少なくとも1つ選んでください。');
      return;
    }
    const normalized = { ...practiceSettings, count };
    setSettings(normalized);
    setPrompts(createPrompts(normalized.shapes, count, normalized.lightDirections));
    setQuestionIndex(0);
    setRemaining(normalized.time ?? 0);
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
    setPrompts([{
      ...currentResult.prompt,
      id: `${currentResult.prompt.id}-retry-${Date.now()}`,
    }]);
    setQuestionIndex(0);
    setRemaining(settings.time ?? 0);
    setElapsed(0);
    setPaused(false);
    setStrokes([]);
    setRedoStrokes([]);
    finishingRef.current = false;
    setScreen('practice');
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
    activeStrokeRef.current = {
      points: [canvasPoint(event)],
      width: settings.penWidth,
      eraser: tool === 'eraser',
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
    context.globalCompositeOperation = stroke.eraser ? 'destination-out' : 'source-over';
    context.strokeStyle = '#30322c';
    context.lineWidth = stroke.eraser ? stroke.width * 4 : stroke.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(previousPoint.x * rect.width, previousPoint.y * rect.height);
    context.lineTo(nextPoint.x * rect.width, nextPoint.y * rect.height);
    context.stroke();
    context.restore();
  };

  const endStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const stroke = activeStrokeRef.current;
    if (!stroke) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
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
    context.drawImage(sample, 50, 130, 545, 500);
    context.drawImage(drawing, 645, 130, 545, 500);
    context.fillStyle = '#686b60';
    context.font = '18px sans-serif';
    context.fillText(`描画時間 ${currentResult.seconds}秒`, 50, 680);
    downloadDataUrl(output.toDataURL('image/png'), `solid-drawing-${selectedResult + 1}.png`);
  };

  const saveAllComparisons = async () => {
    if (!attempts.length) return;
    const output = document.createElement('canvas');
    const rowHeight = 370;
    output.width = 1240;
    output.height = 130 + attempts.length * rowHeight;
    const context = output.getContext('2d');
    if (!context) return;

    context.fillStyle = '#f1efe8';
    context.fillRect(0, 0, output.width, output.height);
    context.fillStyle = '#25261f';
    context.font = 'bold 34px sans-serif';
    context.fillText('立体ドローイング 練習結果', 50, 55);
    context.fillStyle = '#686b60';
    context.font = '18px sans-serif';
    context.fillText(`${attempts.length}回分の見本と描画`, 50, 91);

    const load = (source: string) => new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = source;
    });

    for (const [index, attempt] of attempts.entries()) {
      const top = 120 + index * rowHeight;
      const [sample, drawing] = await Promise.all([
        load(attempt.sampleImage),
        load(attempt.drawingImage),
      ]);

      context.fillStyle = '#25261f';
      context.font = 'bold 22px sans-serif';
      context.fillText(`${index + 1}. ${attempt.prompt.shape}`, 50, top + 28);
      context.fillStyle = '#686b60';
      context.font = '16px sans-serif';
      context.fillText(`描画時間 ${attempt.seconds}秒`, 1040, top + 28);
      context.fillText('見本', 50, top + 58);
      context.fillText('描いたもの', 645, top + 58);
      context.fillStyle = '#ffffff';
      context.fillRect(50, top + 72, 545, 270);
      context.fillRect(645, top + 72, 545, 270);
      context.drawImage(sample, 50, top + 72, 545, 270);
      context.drawImage(drawing, 645, top + 72, 545, 270);
    }

    downloadDataUrl(output.toDataURL('image/png'), 'solid-drawing-all-results.png');
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="brand" type="button" onClick={() => goTo('home')}>
          <span className="brand-mark" aria-hidden="true">◇</span>
          <span>立体ドローイング</span>
        </button>
        <nav className="step-nav" aria-label="練習の流れ">
          {([
            ['home', '1 トップ'],
            ['settings', '2 設定'],
            ['practice', '3 練習'],
            ['results', '4 比較'],
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
            <p className="lead">ランダムな角度から見た立体を、決めた時間内に描く練習です。最後に見本と自分の線を並べて振り返れます。</p>
            <ul className="feature-list">
              <li>6種類の立体をその場で生成</li>
              <li>10〜60秒、または時間制限なし</li>
              <li>最大20回まで連続練習</li>
            </ul>
            <div className="button-row">
              <button className="button primary" type="button" onClick={() => startPractice()}>開始する</button>
              <button className="button secondary" type="button" onClick={() => setScreen('settings')}>設定する</button>
            </div>
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
              </div>
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
                  <legend>光源の向き</legend>
                  <div className="light-direction-options">
                    {LIGHT_DIRECTIONS.map(({ value, label }) => (
                      <label key={value} className="check-option">
                        <input
                          type="checkbox"
                          checked={settings.lightDirections.includes(value)}
                          onChange={() => toggleLightDirection(value)}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <small>選択した向きの中から問題ごとにランダムで光を当てます。</small>
                </fieldset>
              )}
              <p className="setting-note">問題ごとに角度と比率をランダム生成</p>
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
            <div className="timer" aria-live="polite"><small>{settings.time === null ? '経過時間' : '残り時間'}</small><strong>{formatTime(settings.time === null ? elapsed : remaining)}</strong></div>
            <div className="practice-actions"><button className="button secondary compact" type="button" onClick={() => setPaused((value) => !value)}>{paused ? '再開' : '一時停止'}</button><button className="text-button danger" type="button" onClick={stopPractice}>終了</button></div>
          </div>

          <div className={`workspace-layout layout-${settings.layout}`}>
            <section className="work-panel sample-panel">
              <div className="work-panel-header">
                <strong>見本</strong>
                <small>{settings.sampleStyle === 'shadow' ? `光源 ${LIGHT_DIRECTIONS.find(({ value }) => value === currentPrompt.lightDirection)?.label}・見る方向はランダム` : '見る方向はランダム'}</small>
              </div>
              <div className="canvas-stage">
                <canvas ref={sampleCanvasRef} className={paused ? 'sample-canvas hidden-sample' : 'sample-canvas'} aria-label={`${currentPrompt.shape}の見本`} />
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
                    width: tool === 'eraser' ? settings.penWidth * 4 : settings.penWidth,
                    height: tool === 'eraser' ? settings.penWidth * 4 : settings.penWidth,
                  }}
                  aria-hidden="true"
                />
                {paused && <div className="drawing-pause-shield" aria-hidden="true" />}
              </div>
              <div className="drawing-toolbar" aria-label="描画ツール">
                <button className={tool === 'pen' ? 'tool-button selected' : 'tool-button'} type="button" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}>ペン</button>
                <button className={tool === 'eraser' ? 'tool-button selected' : 'tool-button'} type="button" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>消しゴム</button>
                <button className="tool-button" type="button" disabled={!strokes.length} onClick={undo}>元に戻す</button>
                <button className="tool-button" type="button" disabled={!redoStrokes.length} onClick={redo}>やり直す</button>
                <button className="tool-button" type="button" disabled={!strokes.length} onClick={() => { setStrokes([]); setRedoStrokes([]); }}>全消去</button>
              </div>
            </section>
          </div>
          <div className="practice-footer">
            <p>{settings.time === null ? '描き終わったら「保存して次へ」を押します。' : '時間終了後、自動保存して次の問題へ進みます。'}</p>
            {settings.time === null && <button className="button primary compact" type="button" onClick={() => finishCurrent(false)}>保存して次へ</button>}
          </div>
        </section>
      )}

      {screen === 'results' && attempts.length > 0 && (
        <section className="results-section">
          <div className="results-heading">
            <div><h2>練習結果</h2><div className="result-meta"><span>{attempts.length}回完了</span><span>合計 {formatTime(sessionSeconds)}</span><span>{new Intl.DateTimeFormat('ja-JP', { dateStyle: 'medium' }).format(new Date())}</span></div></div>
            <div className="button-row">
              <button className="button secondary" type="button" onClick={retryCurrentPrompt}>今回と同じ立体でもう一度</button>
              <button className="button primary" type="button" onClick={() => startPractice()}>同じ設定でもう一度</button>
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
                  <div className="button-row"><button className="button secondary compact" type="button" onClick={saveComparison}>比較画像を保存</button><button className="button secondary compact" type="button" onClick={() => downloadDataUrl(currentResult.drawingImage, `drawing-${selectedResult + 1}.png`)}>描画だけ保存</button><button className="button primary compact" type="button" onClick={saveAllComparisons}>全結果をまとめて保存</button></div>
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
