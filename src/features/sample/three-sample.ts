import * as THREE from 'three';
import type { SampleStyle } from '../settings/practice-settings';
import { fitCameraToSample } from './sample-camera';
import { buildSampleScene, disposeSampleScene } from './sample-scene';
import type { SampleRenderLayer, ThreeShapePrompt } from './types';

export type RenderSampleOptions = {
  /** 完成見本・形状だけ・投影影だけのどれを描画するか。 */
  renderLayer?: SampleRenderLayer;
};

const renderers = new WeakMap<HTMLCanvasElement, THREE.WebGLRenderer>();

function rendererFor(canvas: HTMLCanvasElement) {
  const current = renderers.get(canvas);
  if (current) return current;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.shadowMap.enabled = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderers.set(canvas, renderer);
  return renderer;
}

export function renderSample3D(
  canvas: HTMLCanvasElement,
  prompt: ThreeShapePrompt,
  style: SampleStyle = 'shaded',
  background = '#ffffff',
  options: RenderSampleOptions = {},
) {
  const renderLayer = options.renderLayer ?? 'complete';
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const renderer = rendererFor(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(rect.width, rect.height, false);
  renderer.setClearColor(background, 1);
  const rendersShadow = style === 'shadow' && renderLayer !== 'shape';
  renderer.shadowMap.enabled = rendersShadow;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.needsUpdate = rendersShadow;

  const camera = new THREE.PerspectiveCamera(32, rect.width / rect.height, 0.1, 100);
  const distance = 5.4;
  const cameraTarget = new THREE.Vector3(0, style === 'shadow' ? -0.12 : 0, 0);
  const horizontalDistance = Math.cos(prompt.cameraElevation) * distance;
  camera.position.set(
    Math.sin(prompt.cameraAzimuth) * horizontalDistance,
    Math.sin(prompt.cameraElevation) * distance,
    Math.cos(prompt.cameraAzimuth) * horizontalDistance,
  );
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld();

  const scene = buildSampleScene(prompt, style, background, camera, {
    renderLayer,
  });
  fitCameraToSample(camera, scene, cameraTarget);
  renderer.render(scene, camera);
  disposeSampleScene(scene);
}

export function disposeSample3D(canvas: HTMLCanvasElement) {
  const renderer = renderers.get(canvas);
  if (!renderer) return;
  renderer.dispose();
  renderers.delete(canvas);
}
