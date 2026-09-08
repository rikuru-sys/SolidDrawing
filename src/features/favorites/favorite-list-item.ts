import type { ShapeName } from '../../domain/prompt/types';
import { LIGHT_DIRECTION_OPTIONS } from '../settings/settings-options';
import { createPromptIdentity } from './prompt-identity';
import type { Favorite } from './types';

export type FavoriteListItem = {
  favorite: Favorite;
  promptKey: string;
  displayName: string;
};

/** 同じ種類の立体を連番で区別し、保存した光源方向を名前へ含める。 */
export function createFavoriteListItems(favorites: Favorite[]): FavoriteListItem[] {
  const shapeCounts = new Map<ShapeName, number>();

  return favorites.map((favorite) => {
    const { prompt } = favorite;
    const shapeNumber = (shapeCounts.get(prompt.shape) ?? 0) + 1;
    shapeCounts.set(prompt.shape, shapeNumber);
    const lightLabel = LIGHT_DIRECTION_OPTIONS.find(
      ({ value }) => value === prompt.lightDirection,
    )?.label ?? prompt.lightDirection;

    return {
      favorite,
      promptKey: createPromptIdentity(prompt),
      displayName: `${prompt.shape} ${shapeNumber}・光源${lightLabel}`,
    };
  });
}
