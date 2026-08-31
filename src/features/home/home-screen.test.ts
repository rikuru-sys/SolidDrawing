import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HomeScreen } from './home-screen';

describe('HomeScreen', () => {
  it('練習の概要と開始操作を表示する', () => {
    const html = renderToStaticMarkup(createElement(HomeScreen, {
      canvasRef: createRef<HTMLCanvasElement>(),
      onStart: () => undefined,
      onOpenSettings: () => undefined,
    }));

    expect(html).toContain('立体を観察して');
    expect(html).toContain('>開始する</button>');
    expect(html).toContain('>設定する</button>');
    expect(html).toContain('薄い陰影が付いた立方体');
  });
});
