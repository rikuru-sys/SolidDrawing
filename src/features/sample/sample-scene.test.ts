import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { ShapeName } from '../../domain/prompt/types';
import {
  buildSampleScene,
  disposeSampleScene,
} from './sample-scene';
import type { ThreeShapePrompt } from './types';

const ALL_SHAPES = ['立方体', '直方体', '円柱', '楕円柱', '三角錐', '円錐'] as const satisfies readonly ShapeName[];

function prompt(shape: ShapeName): ThreeShapePrompt {
  return {
    shape,
    widthScale: 1,
    heightScale: 1,
    depthScale: 1,
    cameraAzimuth: 0.4,
    cameraElevation: 0.3,
    objectRotationX: 0,
    objectRotationY: 0,
    objectRotationZ: 0,
    lightDirection: 'top-left',
  };
}

function camera() {
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(2, 2, 5);
  camera.lookAt(0, -0.12, 0);
  camera.updateMatrixWorld();
  return camera;
}

function includesShadowEnvironment(scene: THREE.Scene) {
  let includesShadow = false;
  scene.traverse((object) => {
    if (object instanceof THREE.DirectionalLight && object.castShadow) {
      includesShadow = true;
    }
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (materials.some((material) => material instanceof THREE.ShadowMaterial)) {
      includesShadow = true;
    }
  });
  return includesShadow;
}

function includesObject(scene: THREE.Scene, name: string) {
  return Boolean(scene.getObjectByName(name));
}

describe('buildSampleScene', () => {
  it('画面表示用の影モードには投影影を作る環境を含める', () => {
    const scene = buildSampleScene(prompt('立方体'), 'shadow', '#ffffff', camera());

    expect(includesShadowEnvironment(scene)).toBe(true);
    expect(includesObject(scene, 'sample-shape')).toBe(true);
    expect(includesObject(scene, 'ground-line')).toBe(true);
    disposeSampleScene(scene);
  });

  it.each(ALL_SHAPES)('%sの形状評価用シーンには投影影を作る環境を含めない', (shape) => {
    const scene = buildSampleScene(prompt(shape), 'shadow', '#ffffff', camera(), {
      renderLayer: 'shape',
    });

    expect(includesShadowEnvironment(scene)).toBe(false);
    expect(scene.children.some((object) => object instanceof THREE.Mesh)).toBe(true);
    disposeSampleScene(scene);
  });

  it.each(ALL_SHAPES)('%sの影評価用シーンには投影影だけを含める', (shape) => {
    const scene = buildSampleScene(prompt(shape), 'shadow', '#ffffff', camera(), {
      renderLayer: 'shadow',
    });

    expect(includesShadowEnvironment(scene)).toBe(true);
    expect(includesObject(scene, 'sample-shape')).toBe(true);
    expect(includesObject(scene, 'cast-shadow-plane')).toBe(true);
    expect(includesObject(scene, 'ground-line')).toBe(false);
    expect(scene.children.some((object) => object instanceof THREE.LineSegments)).toBe(false);
    disposeSampleScene(scene);
  });
});
