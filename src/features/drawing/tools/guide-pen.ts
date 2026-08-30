import type { DrawingToolDefinition } from '../types';
import { createStroke } from './create-stroke';

export const guidePenTool = {
  id: 'guide',
  label: '補助線',
  evaluationRole: 'ignore',
  continuesDashPattern: false,
  cursorUsesPenColor: true,
  createStroke: (options) => createStroke('guide', options),
  getLineWidth: (stroke) => Math.max(1, stroke.width * 0.65),
  getOpacity: (stroke) => Math.min(0.35, stroke.opacity * 0.4),
  getLineDash: () => [],
  getCursorSize: (penWidth) => Math.max(1, penWidth * 0.65),
} satisfies DrawingToolDefinition;
