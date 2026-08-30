import type { DrawingToolDefinition } from '../types';
import { createStroke } from './create-stroke';

export const dashedPenTool = {
  id: 'dashed',
  label: '点線',
  evaluationRole: 'draw',
  continuesDashPattern: true,
  cursorUsesPenColor: true,
  createStroke: (options) => createStroke('dashed', options),
  getLineWidth: (stroke) => stroke.width,
  getOpacity: (stroke) => stroke.opacity,
  getLineDash: (lineWidth) => [Math.max(0.2, lineWidth * 0.2), lineWidth * 2.2],
  getCursorSize: (penWidth) => penWidth,
} satisfies DrawingToolDefinition;
