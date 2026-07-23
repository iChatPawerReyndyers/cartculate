// recipeLogic.ts
// Pure functions for the Smart Recipe tab: scaling ingredient quantities
// and converting a scaled recipe into cart rows the Cart screen understands.

import { CartRow, Recipe, RecipeIngredient, ScaledIngredient } from '../types';

/** Returns a new ingredient list with quantities multiplied by scaleFactor. */
export function scaleIngredients(
  ingredients: RecipeIngredient[],
  scaleFactor: number
): ScaledIngredient[] {
  return ingredients.map((ing) => ({
    ...ing,
    scaledQuantity: roundToTwoDecimals(ing.baseQuantity * scaleFactor),
  }));
}

function roundToTwoDecimals(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * "Add to cart" fusion: turns a scaled recipe's ingredients into cart rows
 * tagged with this recipe as the source, ready to be merged into the
 * existing cart via consolidateCart() in cartLogic.ts.
 */
export function buildCartRowsFromRecipe(
  recipe: Recipe,
  scaleFactor: number
): CartRow[] {
  const scaled = scaleIngredients(recipe.ingredients, scaleFactor);

  return scaled.map((ing) => ({
    id: `${recipe.id}-${ing.itemId}-${Date.now()}`,
    itemId: ing.itemId,
    itemName: ing.itemName,
    storeId: ing.defaultStoreId,
    storeName: ing.defaultStoreName,
    price: ing.defaultPrice,
    quantity: ing.scaledQuantity,
    sourceRecipeId: recipe.id,
    sourceRecipeName: recipe.name,
  }));
}

/**
 * Merges newly-added recipe rows into an existing cartRows array.
 * If a row with the same (itemId, storeId, sourceRecipeId) already exists
 * (e.g. recipe added twice), quantities are summed instead of duplicated.
 */
export function mergeCartRows(existingRows: CartRow[], newRows: CartRow[]): CartRow[] {
  const merged = [...existingRows];

  for (const newRow of newRows) {
    const idx = merged.findIndex(
      (r) =>
        r.itemId === newRow.itemId &&
        r.storeId === newRow.storeId &&
        r.sourceRecipeId === newRow.sourceRecipeId
    );
    if (idx !== -1) {
      merged[idx] = {
        ...merged[idx],
        quantity: merged[idx].quantity + newRow.quantity,
      };
    } else {
      merged.push(newRow);
    }
  }

  return merged;
}