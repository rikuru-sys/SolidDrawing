import type { Point } from '../drawing/types';

/**
 * 二値マスク上の各評価対象ピクセルを、指定した半径だけ周囲へ広げる。
 *
 * @param mask - 0を背景、1を評価対象として持つ二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @param radius - 評価対象を周囲へ広げるピクセル数
 * @returns 元のマスクを変更せずに作成した、膨張後の二値マスク
 *
 * @remarks
 * 見本線から多少ずれた描画線も一致とみなせるよう、`maskMatch`へ渡す前に使用する。
 */
export function dilateMask(mask: Uint8Array, size: number, radius: number) {
  const output = new Uint8Array(mask.length);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!mask[y * size + x]) continue;
      const minY = Math.max(0, y - radius);
      const maxY = Math.min(size - 1, y + radius);
      const minX = Math.max(0, x - radius);
      const maxX = Math.min(size - 1, x + radius);
      for (let targetY = minY; targetY <= maxY; targetY += 1) {
        for (let targetX = minX; targetX <= maxX; targetX += 1) {
          output[targetY * size + targetX] = 1;
        }
      }
    }
  }
  return output;
}

/**
 * 比較元の評価対象ピクセルが、比較先マスク内に存在する割合を求める。
 *
 * @param source - 一致しているかを調べる側の二値マスク
 * @param dilatedTarget - 許容距離の分だけ膨張済みの比較先マスク
 * @returns 一致率。すべて一致なら1、まったく一致しなければ0
 *
 * @remarks
 * この関数は方向を持つ。`source`と`dilatedTarget`を入れ替えると、
 * 描き足しと描き漏らしのどちらを調べるかが変わる。
 */
export function maskMatch(source: Uint8Array, dilatedTarget: Uint8Array) {
  let total = 0;
  let matched = 0;
  source.forEach((value, index) => {
    if (!value) return;
    total += 1;
    if (dilatedTarget[index]) matched += 1;
  });
  return total ? matched / total : 0;
}

/**
 * 二値マスクを囲む最小の長方形について、幅・高さ・中心座標を求める。
 *
 * @param mask - 範囲を調べる二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @returns 外接矩形の情報。評価対象ピクセルがなければ`null`
 */
export function maskBounds(mask: Uint8Array, size: number) {
  let minX = size;
  let minY = size;
  let maxX = -1;
  let maxY = -1;
  mask.forEach((value, index) => {
    if (!value) return;
    const x = index % size;
    const y = Math.floor(index / size);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  if (maxX < 0 || maxY < 0) return null;
  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

/**
 * 二値マスクを拡大・縮小せず、指定したピクセル数だけ平行移動する。
 *
 * @param mask - 移動する二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @param offsetX - 水平方向の移動量。正の値なら右へ移動する
 * @param offsetY - 垂直方向の移動量。正の値なら下へ移動する
 * @returns 移動後の新しい二値マスク。範囲外へ出たピクセルは含まれない
 */
export function translateMask(mask: Uint8Array, size: number, offsetX: number, offsetY: number) {
  const output = new Uint8Array(mask.length);
  mask.forEach((value, index) => {
    if (!value) return;
    const x = (index % size) + offsetX;
    const y = Math.floor(index / size) + offsetY;
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    output[y * size + x] = 1;
  });
  return output;
}

/**
 * 指定位置の周囲にあるマスク点から、局所的な線の向きと信頼度を求める。
 *
 * @param mask - 線の向きを調べる二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @param centerX - 調査する中心のX座標
 * @param centerY - 調査する中心のY座標
 * @returns ラジアン単位の角度と信頼度。方向を特定できなければ`null`
 *
 * @remarks
 * 中心から半径5ピクセル以内の点の分布を調べる。点が直線状に並ぶほど
 * `confidence`が高くなり、角や面のように方向が曖昧な場所は評価から除外される。
 */
function localLineDirection(mask: Uint8Array, size: number, centerX: number, centerY: number) {
  const radius = 5;
  const points: Point[] = [];
  for (let y = Math.max(0, centerY - radius); y <= Math.min(size - 1, centerY + radius); y += 1) {
    for (let x = Math.max(0, centerX - radius); x <= Math.min(size - 1, centerX + radius); x += 1) {
      if (mask[y * size + x]) points.push({ x, y });
    }
  }
  if (points.length < 4) return null;

  const meanX = points.reduce((total, point) => total + point.x, 0) / points.length;
  const meanY = points.reduce((total, point) => total + point.y, 0) / points.length;
  let covarianceX = 0;
  let covarianceY = 0;
  let covarianceXY = 0;
  points.forEach((point) => {
    const x = point.x - meanX;
    const y = point.y - meanY;
    covarianceX += x * x;
    covarianceY += y * y;
    covarianceXY += x * y;
  });

  const trace = covarianceX + covarianceY;
  if (!trace) return null;
  const separation = Math.hypot(covarianceX - covarianceY, 2 * covarianceXY);
  const confidence = separation / trace;
  if (confidence < 0.18) return null;

  return {
    angle: 0.5 * Math.atan2(2 * covarianceXY, covarianceX - covarianceY),
    confidence,
  };
}

/**
 * 指定位置から一定範囲内にある、最も近い評価対象ピクセルを探す。
 *
 * @param mask - 探索対象の二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @param x - 探索を開始するX座標
 * @param y - 探索を開始するY座標
 * @param radius - 探索する半径（ピクセル単位）
 * @returns 最も近いマスク点。範囲内に存在しなければ`null`
 */
function nearestMaskPoint(mask: Uint8Array, size: number, x: number, y: number, radius: number) {
  let nearest: Point | null = null;
  let nearestDistance = radius * radius + 1;
  for (let targetY = Math.max(0, y - radius); targetY <= Math.min(size - 1, y + radius); targetY += 1) {
    for (let targetX = Math.max(0, x - radius); targetX <= Math.min(size - 1, x + radius); targetX += 1) {
      if (!mask[targetY * size + targetX]) continue;
      const distance = (targetX - x) ** 2 + (targetY - y) ** 2;
      if (distance >= nearestDistance) continue;
      nearestDistance = distance;
      nearest = { x: targetX, y: targetY };
    }
  }
  return nearest;
}

/**
 * 描画線と、その近くにある見本線の局所的な角度を比較する。
 *
 * @param sampleMask - 見本の二値マスク
 * @param drawingMask - 中心合わせ後の描画の二値マスク
 * @param size - 正方形マスクの一辺のピクセル数
 * @param tolerance - 対応する見本線を探す距離（ピクセル単位）
 * @returns 角度の一致率。判定できる描画点が少なければ`null`
 *
 * @remarks
 * 描画線を3ピクセルおきに調べ、近くの見本線との角度差を比較する。
 * 角度差が0度なら一致率1、30度以上なら0として、方向の信頼度で重み付けする。
 */
export function lineAngleMatch(
  sampleMask: Uint8Array,
  drawingMask: Uint8Array,
  size: number,
  tolerance: number,
) {
  let totalWeight = 0;
  let matchedWeight = 0;
  let sampleCount = 0;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      if (!drawingMask[index] || index % 3 !== 0) continue;
      const drawingDirection = localLineDirection(drawingMask, size, x, y);
      if (!drawingDirection) continue;
      totalWeight += drawingDirection.confidence;
      sampleCount += 1;
      const samplePoint = nearestMaskPoint(sampleMask, size, x, y, tolerance);
      if (!samplePoint) continue;
      const sampleDirection = localLineDirection(sampleMask, size, samplePoint.x, samplePoint.y);
      if (!sampleDirection) continue;
      let difference = Math.abs(drawingDirection.angle - sampleDirection.angle) % Math.PI;
      difference = Math.min(difference, Math.PI - difference);
      const similarity = Math.max(0, 1 - difference / (Math.PI / 6));
      const weight = Math.min(drawingDirection.confidence, sampleDirection.confidence);
      matchedWeight += similarity * weight;
    }
  }
  return sampleCount >= 12 && totalWeight ? matchedWeight / totalWeight : null;
}

/**
 * 0〜1の一致率を、評価をやや厳しくした0〜100点へ変換する。
 *
 * @param ratio - 変換前の一致率
 * @returns 0〜100の整数に変換した評価点
 *
 * @remarks
 * `ratio ** 1.2`とすることで、完全一致以外の値を単純な百分率より少し低くする。
 */
export function strictMetricScore(ratio: number) {
  const normalizedRatio = Math.max(0, Math.min(1, ratio));
  return Math.round(Math.pow(normalizedRatio, 1.2) * 100);
}
