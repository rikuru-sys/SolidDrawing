import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { freshDefaultSettings } from '../settings/practice-settings';
import { FavoritesScreen, type FavoritesScreenProps } from './favorites-screen';
import type { Favorite } from './types';

function favorite(overrides: Partial<Favorite> = {}): Favorite {
  return {
    id: 'favorite-1',
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
    settings: freshDefaultSettings(),
    createdAt: new Date('2026-08-30T00:00:00+09:00').getTime(),
    ...overrides,
  };
}

function renderFavorites(overrides: Partial<FavoritesScreenProps> = {}) {
  const selected = favorite();
  const props: FavoritesScreenProps = {
    favorites: [selected],
    selectedFavorite: selected,
    onSelectFavorite: () => undefined,
    onPracticeFavorite: () => undefined,
    onDeleteFavorite: () => undefined,
    onStartPractice: () => undefined,
    onBack: () => undefined,
    ...overrides,
  };
  return renderToStaticMarkup(createElement(FavoritesScreen, props));
}

describe('FavoritesScreen', () => {
  it('renders the empty state and practice action', () => {
    const html = renderFavorites({ favorites: [], selectedFavorite: null });

    expect(html).toContain('お気に入りはまだありません');
    expect(html).toContain('練習を始める');
    expect(html).not.toContain('favorite-preview-panel');
  });

  it('renders the selected favorite, its settings, and actions', () => {
    const selected = favorite();
    const second = favorite({
      id: 'favorite-2',
      prompt: { ...selected.prompt, id: 'prompt-2', shape: '円柱' },
    });
    const html = renderFavorites({ favorites: [selected, second], selectedFavorite: selected });

    expect(html).toContain('★ 立方体');
    expect(html).toContain('★ 円柱');
    expect(html).toContain('aria-label="お気に入りの立方体"');
    expect(html).toContain('輪郭線と薄い陰影');
    expect(html).toContain('この見本でもう一度');
    expect(html).toContain('お気に入りから削除');
  });

  it('renders sample-only, hidden-partway, shadow, and light settings', () => {
    const selected = favorite();
    const shadowFavorite = favorite({
      prompt: {
        ...selected.prompt,
        shape: '三角錐',
        lightDirection: 'bottom-right',
      },
      settings: {
        ...freshDefaultSettings(),
        difficulty: 'hard',
        practiceMode: 'sample-only',
        sampleStyle: 'shadow',
        sampleVisibility: 'partway',
        time: null,
      },
    });
    const html = renderFavorites({
      favorites: [shadowFavorite],
      selectedFavorite: shadowFavorite,
    });

    expect(html).toContain('難しい・見本のみ・時間指定なし');
    expect(html).toContain('光源 右下');
    expect(html).toContain('輪郭線と影');
    expect(html).toContain('途中で隠す');
    expect(html).toContain('指定なし');
  });
});
