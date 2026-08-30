export type Stabilization = 'off' | 'low' | 'medium';
export type DrawingToolId = 'pen' | 'dashed' | 'guide' | 'eraser';
export type EvaluationRole = 'draw' | 'erase' | 'ignore';

export type Point = {
  x: number;
  y: number;
};

export type Stroke = {
  tool: DrawingToolId;
  points: Point[];
  width: number;
  color: string;
  opacity: number;
  stabilization: Stabilization;
};

export type CreateStrokeOptions = {
  point: Point;
  width: number;
  color: string;
  opacity: number;
  stabilization: Stabilization;
};

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
