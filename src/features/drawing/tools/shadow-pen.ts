import type { DrawingToolDefinition } from '../types';
import { createStroke } from './create-stroke';

/**
 * 投影影を塗るためのペン。
 *
 * 見た目の透明度ではなくツールIDで影を識別するため、通常ペンの薄い線が
 * 誤って影として評価されることはない。
 */
export const shadowPenTool = {
  id: 'shadow',
  label: '影',
  evaluationRole: 'shadow',
  continuesDashPattern: false,
  cursorUsesPenColor: false,
  createStroke: (options) => createStroke('shadow', {
    ...options,
    color: '#5f615b',
    opacity: 0.32,
  }),
  getLineWidth: (stroke) => stroke.width * 4,
  getOpacity: (stroke) => stroke.opacity,
  getLineDash: () => [],
  getCursorSize: (penWidth) => penWidth * 4,
} satisfies DrawingToolDefinition;
