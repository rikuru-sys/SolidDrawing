import type { DrawingToolDefinition } from '../types';
import { createStroke } from './create-stroke';

export const eraserTool = {
  id: 'eraser',
  label: '消しゴム',
  evaluationRole: 'erase',
  continuesDashPattern: false,
  cursorUsesPenColor: false,
  createStroke: (options) => createStroke('eraser', options, 'off'),
  getLineWidth: (stroke) => stroke.width * 4,
  getOpacity: () => 1,
  getLineDash: () => [],
  getCursorSize: (penWidth) => penWidth * 4,
} satisfies DrawingToolDefinition;
