import type { ShapePrompt } from '../../domain/prompt/types';

/**
 * 表示結果を決める値から、見本の同一判定に使う安定したキーを作る。
 * 出題IDと生成履歴は、同じ見本を再挑戦しても変化し得るため含めない。
 */
export function createPromptIdentity(prompt: ShapePrompt) {
  return JSON.stringify([
    prompt.shape,
    prompt.widthScale,
    prompt.heightScale,
    prompt.depthScale,
    prompt.cameraAzimuth,
    prompt.cameraElevation,
    prompt.objectRotationX,
    prompt.objectRotationY,
    prompt.objectRotationZ,
    prompt.lightDirection,
  ]);
}
