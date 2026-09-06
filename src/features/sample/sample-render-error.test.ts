import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SampleRenderError } from './sample-render-error';

describe('SampleRenderError', () => {
  it('3D見本の失敗内容と再試行操作を表示する', () => {
    const html = renderToStaticMarkup(createElement(SampleRenderError, {
      onRetry: () => undefined,
    }));

    expect(html).toContain('role="alert"');
    expect(html).toContain('3D見本を表示できませんでした');
    expect(html).toContain('再試行する');
  });
});
