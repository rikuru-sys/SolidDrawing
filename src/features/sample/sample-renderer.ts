import type { SampleStyle } from '../settings/practice-settings';
import type { ThreeShapePrompt } from './types';
import type { RenderSampleOptions } from './three-sample';

type ThreeSampleModule = typeof import('./three-sample');

let modulePromise: Promise<ThreeSampleModule> | null = null;
const renderVersions = new WeakMap<HTMLCanvasElement, number>();

function loadThreeSample() {
  modulePromise ??= import('./three-sample');
  return modulePromise;
}

function nextRenderVersion(canvas: HTMLCanvasElement) {
  const next = (renderVersions.get(canvas) ?? 0) + 1;
  renderVersions.set(canvas, next);
  return next;
}

export function renderSample3D(
  canvas: HTMLCanvasElement,
  prompt: ThreeShapePrompt,
  style: SampleStyle = 'shaded',
  background = '#ffffff',
  options: RenderSampleOptions = {},
) {
  const version = nextRenderVersion(canvas);
  void loadThreeSample().then((module) => {
    if (renderVersions.get(canvas) !== version) return;
    module.renderSample3D(canvas, prompt, style, background, options);
  }).catch((error: unknown) => {
    console.error('3D見本の読み込みに失敗しました。', error);
  });
}

export function disposeSample3D(canvas: HTMLCanvasElement) {
  nextRenderVersion(canvas);
  const pendingModule = modulePromise;
  if (!pendingModule) return;
  void pendingModule.then((module) => {
    module.disposeSample3D(canvas);
  }).catch(() => {
    // The render request reports loading errors. Disposal has nothing else to do.
  });
}
