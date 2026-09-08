import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ShapePrompt } from '../../domain/prompt/types';
import { freshDefaultSettings } from '../settings/practice-settings';
import { FavoritesScreen, type FavoritesScreenProps } from './favorites-screen';
import type { Favorite } from './types';

function favorite(overrides: Partial<ShapePrompt> = {}): Favorite {
  return {
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
      ...overrides,
    },
  };
}

function renderFavorites(overrides: Partial<FavoritesScreenProps> = {}) {
  const selected = favorite();
  const props: FavoritesScreenProps = {
    favorites: [selected],
    selectedFavorite: selected,
    settings: freshDefaultSettings(),
    onSelectFavorite: () => undefined,
    onPracticeFavorites: () => undefined,
    onDeleteFavorite: () => undefined,
    onStartPractice: () => undefined,
    onBack: () => undefined,
    ...overrides,
  };
  return renderToStaticMarkup(createElement(FavoritesScreen, props));
}

describe('FavoritesScreen', () => {
  it('空の案内と練習開始操作を表示する', () => {
    const html = renderFavorites({ favorites: [], selectedFavorite: null });

    expect(html).toContain('お気に入りはまだありません');
    expect(html).toContain('練習を始める');
    expect(html).not.toContain('favorite-preview-panel');
  });

  it('向き・比率・光源を保存した立体とプレビューを表示する', () => {
    const selected = favorite();
    const secondCube = favorite({
      id: 'prompt-2',
      objectRotationY: 0.8,
      lightDirection: 'bottom-left',
    });
    const cylinder = favorite({
      id: 'prompt-3',
      shape: '円柱',
      objectRotationY: 0.8,
      lightDirection: 'top-right',
    });
    const html = renderFavorites({
      favorites: [selected, secondCube, cylinder],
      selectedFavorite: selected,
    });

    expect(html).toContain('★ 立方体 1・光源左上');
    expect(html).toContain('★ 立方体 2・光源左下');
    expect(html).toContain('★ 円柱 1・光源右上');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('立方体 1・光源左上を練習対象に選択');
    expect(html).toContain('立方体 2・光源左下を削除');
    expect(html).toContain('aria-label="お気に入りの立方体 1・光源左上"');
    expect(html).toContain('選択した立体を現在の設定で練習（0件）');
    expect(html).toContain('disabled=""');
  });

  it('保存した光源と現在の練習設定を表示する', () => {
    const selected = favorite({
      shape: '三角錐',
      lightDirection: 'bottom-right',
    });
    const html = renderFavorites({
      favorites: [selected],
      selectedFavorite: selected,
      settings: {
        ...freshDefaultSettings(),
        difficulty: 'hard',
        practiceMode: 'sample-only',
        sampleStyle: 'shadow',
        sampleVisibility: 'partway',
        time: null,
      },
    });

    expect(html).toContain('光源 右下');
    expect(html).toContain('難しい');
    expect(html).toContain('見本のみ');
    expect(html).toContain('輪郭線と影');
    expect(html).toContain('途中で隠す');
    expect(html).toContain('指定なし');
  });
});
