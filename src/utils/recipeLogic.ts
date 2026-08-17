// recipeLogic.ts
// Pure functions for the Smart Recipe tab: scaling ingredient quantities for
// display. Cart syncing on multiplier change is now server-driven (see
// PATCH /api/users/{userId}/recipes/{recipeId}/multiplier and
// recipeApi.ts's updateMultiplier()) rather than a client-side cart merge -
// the old buildCartRowsFromRecipe()/mergeCartRows() functions that used to
// live here are gone, since "Add to cart" is no longer a separate
// client-only action.

import { RecipeIngredient, ScaledIngredient } from '../types';

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
 * FIX: RecipeIngredient.defaultPrice is always quoted per the master
 * Item's own unit (e.g. Beef cubes' Store_Price is ₱320 PER KG), but a
 * recipe ingredient's own baseQuantity/unit can be a smaller measure of
 * the same thing (e.g. "500g" of beef cubes for one batch) - see
 * mockRecipeData.ts. Multiplying baseQuantity directly by defaultPrice
 * without converting first (500 * 320) produced wildly inflated costs
 * (₱160,000 instead of ₱160 for half a kilo). This converts a
 * gram/milliliter quantity down to the kilogram/liter basis defaultPrice
 * is actually quoted in, before any cost multiplication - matching the
 * same g<->kg, mL<->L convention formatQuantityWithUnit() already uses
 * for display (see utils/inputSanitization.ts's CONVERTIBLE_UNITS).
 * Units with no larger counterpart (pc, pack, box, etc, or no unit at
 * all) pass through unchanged, since there's nothing to convert.
 */
const PRICE_BASIS_DIVISOR: Record<string, number> = {
  g: 1000, // defaultPrice is quoted per kg
  mL: 1000, // defaultPrice is quoted per L
};

/** Converts a raw ingredient quantity into the unit basis its defaultPrice is actually quoted in, for cost math only - NOT for display (use formatQuantityWithUnit for that). */
export function priceableQuantity(quantity: number, unit: string | null): number {
  if (!unit) return quantity;
  const divisor = PRICE_BASIS_DIVISOR[unit];
  return divisor ? quantity / divisor : quantity;
}

/** Cost of one ingredient line at a given multiplier, unit-conversion-aware (see priceableQuantity above). */
export function calculateIngredientCost(ingredient: RecipeIngredient, multiplier: number = 1): number {
  return priceableQuantity(ingredient.baseQuantity, ingredient.unit) * ingredient.defaultPrice * multiplier;
}

/** Per-batch cost (multiplier = 1) summed across every ingredient, unit-conversion-aware. */
export function calculatePerBatchCost(ingredients: RecipeIngredient[]): number {
  return ingredients.reduce((sum, ing) => sum + calculateIngredientCost(ing, 1), 0);
}