import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { freshDefaultSettings } from '../settings/practice-settings';
import {
  PracticeScreen,
  type PracticeScreenProps,
} from './practice-screen';

type PracticeOverrides = {
  current?: Partial<PracticeScreenProps['current']>;
  timer?: Partial<PracticeScreenProps['timer']>;
  drawing?: Partial<PracticeScreenProps['drawing']>;
};

function renderPractice(overrides: PracticeOverrides = {}) {
  const props: PracticeScreenProps = {
    current: {
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
      ...overrides.current,
    },
    timer: {
      remainingSeconds: 30,
      elapsedSeconds: 0,
      paused: false,
      ...overrides.timer,
    },
    drawing: {
      tool: 'pen',
      strokeCount: 0,
      redoCount: 0,
      canvasRef: createRef<HTMLCanvasElement>(),
      brushCursorRef: createRef<HTMLDivElement>(),
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
      ...overrides.drawing,
    },
    actions: {
      onTogglePaused: () => undefined,
      onStop: () => undefined,
      onNext: () => undefined,
    },
    sampleCanvasRef: createRef<HTMLCanvasElement>(),
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

  it('見本のみ・時間指定なしでは描画操作を表示しない', () => {
    const html = renderPractice({
      current: {
        settings: {
          ...freshDefaultSettings(),
          practiceMode: 'sample-only',
          time: null,
        },
      },
      timer: { elapsedSeconds: 65 },
    });

    expect(html).toContain('経過時間');
    expect(html).toContain('01:05');
    expect(html).toContain('次の見本へ');
    expect(html).not.toContain('aria-label="描画キャンバス"');
    expect(html).not.toContain('aria-label="描画ツール"');
  });

  it('見本を隠した後の一時停止状態を表示する', () => {
    const html = renderPractice({
      current: {
        settings: {
          ...freshDefaultSettings(),
          sampleVisibility: 'partway',
        },
      },
      timer: { remainingSeconds: 14, paused: true },
    });

    expect(html).toContain('>再開</button>');
    expect(html).toContain('一時停止中');
    expect(html).toContain('再開後も見本は非表示です');
    expect(html).toContain('drawing-pause-shield');
  });

  it('影の練習では選択中の光源と影ペンを表示する', () => {
    const html = renderPractice({
      current: {
        settings: {
          ...freshDefaultSettings(),
          sampleStyle: 'shadow',
        },
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
      },
      drawing: { tool: 'shadow' },
    });

    expect(html).toContain('光源 右下');
    expect(html).toContain('↖');
    expect(html).toContain('>影</button>');
    expect(html).toContain('影色・濃さは固定');
    expect(html).not.toContain('aria-label="練習中のペン色"');
  });
});
