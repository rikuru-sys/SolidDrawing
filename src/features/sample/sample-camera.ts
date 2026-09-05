import * as THREE from 'three';

const MINIMUM_CAMERA_DISTANCE = 5.4;
const CAMERA_VERTICAL_FOV = 32;
const FIT_MARGIN = 1.12;

/**
 * 画面の縦横比にかかわらず、立体を収めるために必要なカメラ距離を求める。
 * 横長では縦方向、縦長では横方向の画角を基準にする。
 */
export function cameraDistanceToFit(
  radius: number,
  aspect: number,
  verticalFovDegrees = CAMERA_VERTICAL_FOV,
) {
  const verticalFov = THREE.MathUtils.degToRad(verticalFovDegrees);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const limitingFov = Math.min(verticalFov, horizontalFov);
  const fittedDistance = (radius / Math.sin(limitingFov / 2)) * FIT_MARGIN;
  return Math.max(MINIMUM_CAMERA_DISTANCE, fittedDistance);
}

/** 生成済みの立体が画面内に収まる位置へカメラを移動する。 */
export function fitCameraToSample(
  camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  target: THREE.Vector3,
) {
  const sample = scene.getObjectByName('sample-shape');
  if (!sample) return;

  const sphere = new THREE.Box3()
    .setFromObject(sample)
    .getBoundingSphere(new THREE.Sphere());
  const distance = cameraDistanceToFit(sphere.radius, camera.aspect, camera.fov);
  const direction = camera.position.clone().sub(target).normalize();

  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);
  camera.updateMatrixWorld();
}
