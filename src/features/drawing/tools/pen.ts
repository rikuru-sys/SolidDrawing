import type { DrawingToolDefinition } from '../types';
import { createStroke } from './create-stroke';

export const penTool = {
  id: 'pen',
  label: 'ペン',
  evaluationRole: 'draw',
  continuesDashPattern: false,
  cursorUsesPenColor: true,
  createStroke: (options) => createStroke('pen', options),
  getLineWidth: (stroke) => stroke.width,
  getOpacity: (stroke) => stroke.opacity,
  getLineDash: () => [],
  getCursorSize: (penWidth) => penWidth,
} satisfies DrawingToolDefinition;
