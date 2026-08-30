export type ShapeName = '立方体' | '直方体' | '円柱' | '楕円柱' | '三角錐' | '円錐';
export type LightDirection = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
export type Difficulty = 'easy' | 'hard';
export type PromptGeneratorVersion = 1;

export type PromptGeneration = {
  seed: number;
  version: PromptGeneratorVersion;
  index: number;
};

export type ShapePrompt = {
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
  generation?: PromptGeneration;
};
