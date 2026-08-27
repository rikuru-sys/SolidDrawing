import * as THREE from 'three';

type SampleStyle = 'shaded' | 'shadow' | 'hidden-lines';
type LightDirection = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

type ThreeShapePrompt = {
  shape: '立方体' | '直方体' | '円柱' | '楕円柱' | '三角錐' | '円錐';
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

function shapeGeometry(prompt: ThreeShapePrompt) {
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
    const geometry = new THREE.CylinderGeometry(0.72, 0.72, 1.55 * prompt.heightScale, 64);
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

  const planeMaterial = new THREE.ShadowMaterial({ color: 0x3f4039, opacity: 0.3 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -1.01;
  plane.receiveShadow = true;
  scene.add(plane);

  const groundGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-3.2, -0.995, 0.25),
    new THREE.Vector3(3.2, -0.995, 0.25),
  ]);
  const groundLine = new THREE.Line(
    groundGeometry,
    new THREE.LineBasicMaterial({ color: 0x777970 }),
  );
  groundLine.renderOrder = 4;
  scene.add(groundLine);
}

function buildScene(
  prompt: ThreeShapePrompt,
  style: SampleStyle,
  background: string,
  camera: THREE.PerspectiveCamera,
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  const geometry = shapeGeometry(prompt);
  const rounded = prompt.shape === '円柱' || prompt.shape === '楕円柱' || prompt.shape === '円錐';

  geometry.rotateX(prompt.objectRotationX);
  geometry.rotateY(prompt.objectRotationY);
  geometry.rotateZ(prompt.objectRotationZ);

  if (style === 'shadow') {
    geometry.computeBoundingBox();
    const minimumY = geometry.boundingBox?.min.y ?? -1;
    geometry.translate(0, -1 - minimumY, 0);
  }

  if (style === 'shaded' || style === 'shadow') {
    const material = new THREE.MeshStandardMaterial({
      color: 0xe5e2d8,
      roughness: 0.9,
      metalness: 0,
      flatShading: !rounded,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 1;
    scene.add(mesh);
    if (style === 'shadow') {
      addShadowEnvironment(scene, mesh, camera, prompt.lightDirection);
    } else {
      scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b6ad, 1.7));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.25);
      keyLight.position.set(-3.5, 5, 4.2);
      scene.add(keyLight);
    }
    if (rounded) addSilhouette(scene, geometry);
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

  addEdgeLines(scene, geometry, style);
  return scene;
}

function disposeScene(scene: THREE.Scene) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => materials.add(material));
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export function renderSample3D(
  canvas: HTMLCanvasElement,
  prompt: ThreeShapePrompt,
  style: SampleStyle = 'shaded',
  background = '#ffffff',
) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const renderer = rendererFor(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(rect.width, rect.height, false);
  renderer.setClearColor(background, 1);
  renderer.shadowMap.enabled = style === 'shadow';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.needsUpdate = style === 'shadow';

  const camera = new THREE.PerspectiveCamera(32, rect.width / rect.height, 0.1, 100);
  const distance = 5.4;
  const horizontalDistance = Math.cos(prompt.cameraElevation) * distance;
  camera.position.set(
    Math.sin(prompt.cameraAzimuth) * horizontalDistance,
    Math.sin(prompt.cameraElevation) * distance,
    Math.cos(prompt.cameraAzimuth) * horizontalDistance,
  );
  camera.lookAt(0, style === 'shadow' ? -0.12 : 0, 0);
  camera.updateMatrixWorld();

  const scene = buildScene(prompt, style, background, camera);
  renderer.render(scene, camera);
  disposeScene(scene);
}

export function disposeSample3D(canvas: HTMLCanvasElement) {
  const renderer = renderers.get(canvas);
  if (!renderer) return;
  renderer.dispose();
  renderers.delete(canvas);
}
