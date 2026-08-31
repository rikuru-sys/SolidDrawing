import * as THREE from 'three';
import type { ShapeName } from '../../domain/prompt/types';
import type { ThreeShapePrompt } from './types';

function triangularPyramidGeometry(prompt: ThreeShapePrompt) {
  const width = 1.7 * prompt.widthScale;
  const height = 1.9 * prompt.heightScale;
  const depth = 1.55 * prompt.depthScale;
  const positions = new Float32Array([
    0, height * 0.58, 0,
    -width * 0.5, -height * 0.42, depth * 0.36,
    width * 0.5, -height * 0.42, depth * 0.36,
    0, -height * 0.42, -depth * 0.64,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex([
    0, 2, 1,
    0, 3, 2,
    0, 1, 3,
    1, 2, 3,
  ]);
  geometry.computeVertexNormals();
  return geometry;
}

export function isRoundedShape(shape: ShapeName) {
  return shape === '円柱' || shape === '楕円柱' || shape === '円錐';
}

export function createShapeGeometry(prompt: ThreeShapePrompt) {
  if (prompt.shape === '立方体') return new THREE.BoxGeometry(1.55, 1.55, 1.55);
  if (prompt.shape === '直方体') {
    return new THREE.BoxGeometry(
      1.9 * prompt.widthScale,
      1.32 * prompt.heightScale,
      1.5 * prompt.depthScale,
    );
  }
  if (prompt.shape === '円柱') {
    return new THREE.CylinderGeometry(
      0.72 * prompt.widthScale,
      0.72 * prompt.widthScale,
      1.8 * prompt.heightScale,
      64,
    );
  }
  if (prompt.shape === '楕円柱') {
    const geometry = new THREE.CylinderGeometry(
      0.72,
      0.72,
      1.55 * prompt.heightScale,
      64,
    );
    geometry.scale(1.28 * prompt.widthScale, 1, 0.76 * prompt.depthScale);
    return geometry;
  }
  if (prompt.shape === '三角錐') return triangularPyramidGeometry(prompt);
  return new THREE.ConeGeometry(
    0.82 * prompt.widthScale,
    1.95 * prompt.heightScale,
    64,
  );
}
