import * as THREE from 'three';
import type { LightDirection } from '../../domain/prompt/types';
import type { SampleStyle } from '../settings/practice-settings';
import { createShapeGeometry, isRoundedShape } from './sample-geometry';
import type { SampleRenderLayer, ThreeShapePrompt } from './types';

function addSilhouette(scene: THREE.Scene, geometry: THREE.BufferGeometry) {
  const material = new THREE.MeshBasicMaterial({
    color: 0x30322c,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const silhouette = new THREE.Mesh(geometry, material);
  silhouette.scale.setScalar(1.012);
  silhouette.renderOrder = 3;
  scene.add(silhouette);
}

function addEdgeLines(
  scene: THREE.Scene,
  geometry: THREE.BufferGeometry,
  style: SampleStyle,
) {
  const threshold = geometry.type === 'BoxGeometry' ? 10 : 28;
  const edgeGeometry = new THREE.EdgesGeometry(geometry, threshold);

  if (style === 'hidden-lines') {
    const hiddenMaterial = new THREE.LineDashedMaterial({
      color: 0x777970,
      dashSize: 0.08,
      gapSize: 0.055,
      depthTest: true,
      depthWrite: false,
    });
    hiddenMaterial.depthFunc = THREE.GreaterDepth;
    const hiddenEdges = new THREE.LineSegments(edgeGeometry, hiddenMaterial);
    hiddenEdges.computeLineDistances();
    hiddenEdges.renderOrder = 1;
    scene.add(hiddenEdges);
  }

  const visibleMaterial = new THREE.LineBasicMaterial({
    color: 0x30322c,
    depthTest: true,
    depthWrite: false,
  });
  visibleMaterial.depthFunc = THREE.LessEqualDepth;
  const visibleEdges = new THREE.LineSegments(edgeGeometry, visibleMaterial);
  visibleEdges.renderOrder = 2;
  scene.add(visibleEdges);
}

function addShadowEnvironment(
  scene: THREE.Scene,
  mesh: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  direction: LightDirection,
  options: { includeGroundLine: boolean; shadowOpacity: number },
) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b5ab, 0.85));

  const target = new THREE.Vector3(0, -0.2, 0);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
  const towardCamera = camera.position.clone().sub(target).normalize();
  const horizontal = direction.endsWith('left') ? -1 : 1;
  const vertical = direction.startsWith('top') ? 1 : -0.35;
  const lightPosition = target.clone()
    .addScaledVector(right, horizontal * 4.2)
    .addScaledVector(up, vertical * 4.5)
    .addScaledVector(towardCamera, 2.2);
  lightPosition.y = Math.max(1.25, lightPosition.y);

  const light = new THREE.DirectionalLight(0xffffff, 2.6);
  light.position.copy(lightPosition);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -3.5;
  light.shadow.camera.right = 3.5;
  light.shadow.camera.top = 3.5;
  light.shadow.camera.bottom = -3.5;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 18;
  light.shadow.bias = -0.0005;
  light.shadow.normalBias = 0.025;
  const lightTarget = new THREE.Object3D();
  lightTarget.position.copy(target);
  scene.add(lightTarget);
  light.target = lightTarget;
  scene.add(light);

  const planeMaterial = new THREE.ShadowMaterial({
    color: 0x3f4039,
    opacity: options.shadowOpacity,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), planeMaterial);
  plane.name = 'cast-shadow-plane';
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1.01;
  plane.receiveShadow = true;
  scene.add(plane);

  if (!options.includeGroundLine) return;

  const groundGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3.2, -0.995, 0.25),
    new THREE.Vector3(3.2, -0.995, 0.25),
  ]);
  const groundLine = new THREE.Line(
    groundGeometry,
    new THREE.LineBasicMaterial({ color: 0x777970 }),
  );
  groundLine.name = 'ground-line';
  groundLine.renderOrder = 4;
  scene.add(groundLine);
}

/** 影を落とさない通常の陰影用ライトを追加する。 */
function addShadedEnvironment(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b6ad, 1.7));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
  keyLight.position.set(-3.5, 5, 4.2);
  scene.add(keyLight);
}

export type BuildSampleSceneOptions = {
  /** 完成見本・形状だけ・投影影だけのどれを描画するか。 */
  renderLayer?: SampleRenderLayer;
};

export function buildSampleScene(
  prompt: ThreeShapePrompt,
  style: SampleStyle,
  background: string,
  camera: THREE.PerspectiveCamera,
  options: BuildSampleSceneOptions = {},
) {
  const renderLayer = options.renderLayer ?? 'complete';
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  const geometry = createShapeGeometry(prompt);
  const rounded = isRoundedShape(prompt.shape);

  geometry.rotateX(prompt.objectRotationX);
  geometry.rotateY(prompt.objectRotationY);
  geometry.rotateZ(prompt.objectRotationZ);

  if (style === 'shadow') {
    geometry.computeBoundingBox();
    const minimumY = geometry.boundingBox?.min.y ?? -1;
    geometry.translate(0, -1 - minimumY, 0);
  }

  if (style === 'shaded' || style === 'shadow') {
    const shadowOnly = style === 'shadow' && renderLayer === 'shadow';
    const material = shadowOnly
      ? new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      : new THREE.MeshStandardMaterial({
        color: 0xe5e2d8,
        roughness: 0.9,
        metalness: 0,
        flatShading: !rounded,
        side: THREE.DoubleSide,
      });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'sample-shape';
    mesh.renderOrder = 1;
    scene.add(mesh);
    if (style === 'shadow' && renderLayer !== 'shape') {
      addShadowEnvironment(scene, mesh, camera, prompt.lightDirection, {
        includeGroundLine: renderLayer === 'complete',
        shadowOpacity: renderLayer === 'shadow' ? 0.75 : 0.3,
      });
    } else {
      addShadedEnvironment(scene);
    }
    if (!shadowOnly && rounded) addSilhouette(scene, geometry);
  } else {
    const depthMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const depthMesh = new THREE.Mesh(geometry, depthMaterial);
    depthMesh.renderOrder = 0;
    scene.add(depthMesh);
    if (rounded) addSilhouette(scene, geometry);
  }

  if (renderLayer !== 'shadow') addEdgeLines(scene, geometry, style);
  return scene;
}

export function disposeSampleScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      objectMaterials.forEach((material) => materials.add(material));
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}
