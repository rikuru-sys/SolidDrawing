import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { freshDefaultSettings } from '../settings/practice-settings';
import { PracticeScreen, type PracticeScreenProps } from './practice-screen';

function renderPractice(overrides: Partial<PracticeScreenProps> = {}) {
  const props: PracticeScreenProps = {
    prompt: {
      id: 'prompt-1',
      shape: '立方体',
      widthScale: 1,
      heightScale: 1,
      depthScale: 1,
      cameraAzimuth: 0.4,
      cameraElevation: 0.3,
      objectRotationX: 0,
      objectRotationY: 0,
      objectRotationZ: 0,
      lightDirection: 'top-left',
    },
    questionIndex: 0,
    questionCount: 3,
    settings: freshDefaultSettings(),
    remainingSeconds: 30,
    elapsedSeconds: 0,
    paused: false,
    tool: 'pen',
    strokeCount: 0,
    redoCount: 0,
    sampleCanvasRef: createRef<HTMLCanvasElement>(),
    drawingCanvasRef: createRef<HTMLCanvasElement>(),
    brushCursorRef: createRef<HTMLDivElement>(),
    onTogglePaused: () => undefined,
    onStop: () => undefined,
    onNext: () => undefined,
    onToolChange: () => undefined,
    onPenStyleChange: () => undefined,
    onUndo: () => undefined,
    onRedo: () => undefined,
    onClear: () => undefined,
    onPointerEnter: () => undefined,
    onPointerDown: () => undefined,
    onPointerMove: () => undefined,
    onPointerEnd: () => undefined,
    onPointerLeave: () => undefined,
    ...overrides,
  };
  return renderToStaticMarkup(createElement(PracticeScreen, props));
}

describe('PracticeScreen', () => {
  it('通常の見本では影ペンを除く描画ツールを表示する', () => {
    const html = renderPractice();

    expect(html).toContain('1 / 3');
    expect(html).toContain('残り時間');
    expect(html).toContain('00:30');
    expect(html).toContain('role="timer"');
    expect(html).toContain('aria-live="polite" aria-atomic="true"');
    expect(html).toContain('aria-valuemin="0"');
    expect(html).toContain('aria-valuetext="1 / 3"');
    expect(html).toContain('aria-pressed="false">一時停止');
    expect(html).toContain('aria-label="描画キャンバス"');
    expect(html).toContain('aria-describedby="practice-instruction"');
    expect(html).toContain('role="group" aria-label="描画ツール"');
    expect(html).toContain('aria-label="ペンの設定"');
    expect(html).toContain('>ペン</button>');
    expect(html).toContain('>点線</button>');
    expect(html).toContain('>補助線</button>');
    expect(html).toContain('>消しゴム</button>');
    expect(html).not.toContain('>影</button>');
    expect(html).not.toContain('保存して次へ');
  });

  it('renders sample-only unlimited practice without drawing controls', () => {
    const html = renderPractice({
      settings: {
        ...freshDefaultSettings(),
        practiceMode: 'sample-only',
        time: null,
      },
      elapsedSeconds: 65,
    });

    expect(html).toContain('経過時間');
    expect(html).toContain('01:05');
    expect(html).toContain('次の見本へ');
    expect(html).not.toContain('aria-label="描画キャンバス"');
    expect(html).not.toContain('aria-label="描画ツール"');
  });

  it('renders the paused state after the sample has been hidden', () => {
    const html = renderPractice({
      settings: {
        ...freshDefaultSettings(),
        sampleVisibility: 'partway',
      },
      remainingSeconds: 14,
      paused: true,
    });

    expect(html).toContain('>再開</button>');
    expect(html).toContain('一時停止中');
    expect(html).toContain('再開後も見本は非表示です');
    expect(html).toContain('drawing-pause-shield');
  });

  it('renders the selected light direction for shadow practice', () => {
    const settings = {
      ...freshDefaultSettings(),
      sampleStyle: 'shadow' as const,
    };
    const html = renderPractice({
      settings,
      tool: 'shadow',
      prompt: {
        id: 'prompt-shadow',
        shape: '円柱',
        widthScale: 1,
        heightScale: 1,
        depthScale: 1,
        cameraAzimuth: 0.4,
        cameraElevation: 0.3,
        objectRotationX: 0,
        objectRotationY: 0,
        objectRotationZ: 0,
        lightDirection: 'bottom-right',
      },
    });

    expect(html).toContain('光源 右下');
    expect(html).toContain('↖');
    expect(html).toContain('>影</button>');
    expect(html).toContain('影色・濃さは固定');
    expect(html).not.toContain('aria-label="練習中のペン色"');
  });
});
