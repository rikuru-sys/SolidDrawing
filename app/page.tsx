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
};

const ALL_SHAPES: ShapeName[] = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'];
const TIME_CHOICES: Array<number | null> = [10, 20, 30, 40, 50, 60, null];
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
};

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function createPrompts(shapes: ShapeName[], count: number): ShapePrompt[] {
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

function drawBox(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number) {
  const cube = prompt.shape === '立方体';
  const width = size * (cube ? 0.54 : 0.66 * prompt.widthScale);
  const height = size * (cube ? 0.5 : 0.43 * prompt.heightScale);
  const depth = size * (cube ? 0.23 : 0.25 * prompt.depthScale);
  const direction = prompt.direction;
  const x = -width / 2;
  const y = -height / 2 + depth * 0.18;
  const dx = direction * depth;
  const dy = -depth * 0.52;

  polygon(context, [[x, y], [x + width, y], [x + width, y + height], [x, y + height]], '#e9e6dc');
  polygon(context, [[x, y], [x + dx, y + dy], [x + width + dx, y + dy], [x + width, y]], '#f5f3ec');
  const sidePoints: Array<[number, number]> = direction > 0
    ? [[x + width, y], [x + width + dx, y + dy], [x + width + dx, y + height + dy], [x + width, y + height]]
    : [[x, y], [x + dx, y + dy], [x + dx, y + height + dy], [x, y + height]];
  polygon(context, sidePoints, '#c9c6bc');
}

function drawCylinder(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number) {
  const elliptical = prompt.shape === '楕円柱';
  const width = size * (elliptical ? 0.66 : 0.54) * prompt.widthScale;
  const height = size * (elliptical ? 0.46 : 0.58) * prompt.heightScale;
  const ellipseHeight = size * (elliptical ? 0.17 : 0.12) * prompt.depthScale;
  const topY = -height / 2;
  const bottomY = height / 2;
  const gradient = context.createLinearGradient(-width / 2, 0, width / 2, 0);
  gradient.addColorStop(0, '#c8c5bb');
  gradient.addColorStop(0.45, '#f0ede4');
  gradient.addColorStop(1, '#d5d2c8');

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
  context.fillStyle = '#f5f3ec';
  context.fill();
  context.stroke();

  context.beginPath();
  context.ellipse(0, bottomY, width / 2, ellipseHeight / 2, 0, 0, Math.PI);
  context.stroke();
}

function drawPyramid(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number) {
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
  polygon(context, [left, right, apex], '#e5e2d8');
  polygon(context, direction > 0 ? [right, back, apex] : [left, back, apex], '#c7c4ba');
  context.beginPath();
  context.moveTo(left[0], left[1]);
  context.lineTo(back[0], back[1]);
  context.lineTo(right[0], right[1]);
  context.stroke();
}

function drawCone(context: CanvasRenderingContext2D, prompt: ShapePrompt, size: number) {
  const width = size * 0.62 * prompt.widthScale;
  const ellipseHeight = size * 0.15 * prompt.depthScale;
  const baseY = size * 0.27;
  const apexX = prompt.direction * size * 0.08;
  const apexY = -size * 0.4 * prompt.heightScale;
  const gradient = context.createLinearGradient(-width / 2, 0, width / 2, 0);
  gradient.addColorStop(0, '#c7c4ba');
  gradient.addColorStop(0.52, '#efede5');
  gradient.addColorStop(1, '#d3d0c7');

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

function drawSample(canvas: HTMLCanvasElement, prompt: ShapePrompt) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  const context = canvas.getContext('2d');
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, rect.width, rect.height);
  context.save();
  context.translate(rect.width / 2, rect.height / 2);
  context.rotate(prompt.rotation);
  context.strokeStyle = '#353730';
  context.lineWidth = 2.25;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  const size = Math.min(rect.width, rect.height) * 0.76;
  if (prompt.shape === '立方体' || prompt.shape === '直方体') drawBox(context, prompt, size);
  if (prompt.shape === '円柱' || prompt.shape === '楕円柱') drawCylinder(context, prompt, size);
  if (prompt.shape === '三角錐') drawPyramid(context, prompt, size);
  if (prompt.shape === '円錐') drawCone(context, prompt, size);
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

  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const finishingRef = useRef(false);
  const finishRef = useRef<(endSession?: boolean) => void>(() => undefined);

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
      setSettings({ ...DEFAULT_SETTINGS, ...parsed, shapes: parsed.shapes?.length ? parsed.shapes : ALL_SHAPES });
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
    if (screen !== 'practice' || !currentPrompt || !sampleCanvasRef.current) return;
    const canvas = sampleCanvasRef.current;
    const render = () => drawSample(canvas, currentPrompt);
    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [currentPrompt, screen]);

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

  const finishCurrent = useCallback((endSession = false) => {
    if (finishingRef.current || !currentPrompt || !sampleCanvasRef.current) return;
    finishingRef.current = true;
    const sampleImage = sampleCanvasRef.current.toDataURL('image/png');
    const drawingImage = exportDrawing();
    const seconds = settings.time === null ? elapsed : Math.max(1, settings.time - remaining);
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
          window.setTimeout(() => finishRef.current(false), 0);
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

  const startPractice = (practiceSettings: Settings = settings) => {
    const count = Math.max(1, Math.min(20, Number(practiceSettings.count) || 1));
    if (!practiceSettings.shapes.length) {
      setValidation('少なくとも1つの立体を選んでください。');
      return;
    }
    const normalized = { ...practiceSettings, count };
    setSettings(normalized);
    setPrompts(createPrompts(normalized.shapes, count));
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

  const canvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const beginStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (paused) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    activeStrokeRef.current = {
      points: [canvasPoint(event)],
      width: settings.penWidth,
      eraser: tool === 'eraser',
    };
    setRedoStrokes([]);
  };

  const continueStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
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
              <button className="button primary" type="button" onClick={() => startPractice(DEFAULT_SETTINGS)}>開始する</button>
              <button className="button secondary" type="button" onClick={() => setScreen('settings')}>設定する</button>
            </div>
          </div>
          <div className="hero-visual" aria-label="薄い陰影が付いた直方体">
            <div className="css-cube" aria-hidden="true"><span className="cube-top" /><span className="cube-left" /><span className="cube-right" /></div>
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
              <div className="readonly-setting"><span>輪郭線＋薄い陰影</span><small>問題ごとに角度と比率をランダム生成</small></div>
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
              <div className="work-panel-header"><strong>見本</strong><small>見る方向はランダム</small></div>
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
                  onPointerDown={beginStroke}
                  onPointerMove={continueStroke}
                  onPointerUp={endStroke}
                  onPointerCancel={endStroke}
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
            <button className="button primary" type="button" onClick={() => startPractice()}>同じ設定でもう一度</button>
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
                  <div className="button-row"><button className="button secondary compact" type="button" onClick={saveComparison}>比較画像を保存</button><button className="button secondary compact" type="button" onClick={() => downloadDataUrl(currentResult.drawingImage, `drawing-${selectedResult + 1}.png`)}>描画だけ保存</button></div>
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
