export type Stabilization = 'off' | 'low' | 'medium';
export type DrawingToolId = 'pen' | 'dashed' | 'guide' | 'eraser';
export type EvaluationRole = 'draw' | 'erase' | 'ignore';

/**
 * 描画領域内の座標を表すポイント
 * @property x - 描画領域の幅に対する相対的なX座標 (0.0〜1.0)
 * @property y - 描画領域の高さに対する相対的なY座標 (0.0〜1.0)
 * @remarks
 * このポイントは、描画領域の幅と高さに対する相対的な座標を表します。
 * 例えば、xが0.5の場合、描画領域の中央のX座標を意味します。
 * yが0.0の場合、描画領域の上端を意味し、yが1.0の場合、描画領域の下端を意味します。
 */
export type Point = {
  x: number;
  y: number;
};

/**
 * 描画ストロークを表すオブジェクト
 * @property tool - 使用された描画ツールのID
 * @property points - ストロークを構成するポイントの配列
 * @property width - ストロークの幅 (ピクセル単位)
 * @property color - ストロークの色 (CSSカラー形式)
 * @property opacity - ストロークの不透明度 (0.0〜1.0)
 * @property stabilization - 手振れ補正の強さ ('off', 'low', 'medium')
 * @remarks
 * このストロークオブジェクトは、描画ツールによって生成され、描画領域に描かれる線や形状を表します。
 * points配列は、ストロークが描かれる際の連続した座標を保持します。
 */
export type Stroke = {
  tool: DrawingToolId;
  points: Point[];
  width: number;
  color: string;
  opacity: number;
  stabilization: Stabilization;
};

/**
 * ストロークを作成するためのオプション
 * @property point - ストロークの開始点となる座標
 * @property width - ストロークの幅 (ピクセル単位)
 * @property color - ストロークの色 (CSSカラー形式)
 * @property opacity - ストロークの不透明度 (0.0〜1.0)
 * @property stabilization - 手振れ補正の強さ ('off', 'low', 'medium')
 */
export type CreateStrokeOptions = {
  point: Point;
  width: number;
  color: string;
  opacity: number;
  stabilization: Stabilization;
};

/**
 * 描画ツールの定義を表すオブジェクト
 * @property id - 描画ツールの一意な識別子
 * @property label - ツールの表示名
 * @property evaluationRole - ツールの評価役割 ('draw', 'erase', 'ignore')
 * @property continuesDashPattern - 点線パターンを継続するかどうか
 * @property cursorUsesPenColor - カーソルがペンの色を使用するかどうか
 * @property createStroke - ストロークを作成する関数
 * @property getLineWidth - ストロークの幅を取得する関数
 * @property getOpacity - ストロークの不透明度を取得する関数
 * @property getLineDash - ストロークの点線パターンを取得する関数
 * @property getCursorSize - カーソルサイズを取得する関数
 */
export type DrawingToolDefinition = {
  id: DrawingToolId;
  label: string;
  evaluationRole: EvaluationRole;
  continuesDashPattern: boolean;
  cursorUsesPenColor: boolean;
  createStroke: (options: CreateStrokeOptions) => Stroke;
  getLineWidth: (stroke: Stroke) => number;
  getOpacity: (stroke: Stroke) => number;
  getLineDash: (lineWidth: number) => number[];
  getCursorSize: (penWidth: number) => number;
};
