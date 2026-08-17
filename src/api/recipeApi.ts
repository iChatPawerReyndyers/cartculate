import { apiRequest, withMockFallback } from './httpClient';
import { mockRecipes } from '../data/mockRecipeData';
import { Recipe } from '../types';

interface RecipeIngredientResponse {
  itemId: string;
  itemName: string;
  category: string;
  baseQuantity: number | string;
  unit: string | null;
  defaultStoreId: string;
  defaultStoreName: string;
  defaultPrice: number | string;
  isCustomRouted: boolean;
  isOptional: boolean;
}

interface RecipeResponse {
  id: string;
  name: string;
  ingredients: RecipeIngredientResponse[];
  currentMultiplier: number | string;
}

function normalizeRecipe(r: RecipeResponse): Recipe {
  return {
    id: r.id,
    name: r.name,
    currentMultiplier: Number(r.currentMultiplier),
    ingredients: r.ingredients.map((ing) => ({
      itemId: ing.itemId,
      itemName: ing.itemName,
      category: ing.category,
      baseQuantity: Number(ing.baseQuantity),
      unit: ing.unit,
      defaultStoreId: ing.defaultStoreId,
      defaultStoreName: ing.defaultStoreName,
      defaultPrice: Number(ing.defaultPrice),
      isCustomRouted: ing.isCustomRouted,
      isOptional: ing.isOptional,
    })),
  };
}

/** GET /api/users/{userId}/recipes */
export async function fetchRecipes(userId: number): Promise<Recipe[]> {
  return withMockFallback(async () => {
    const recipes = await apiRequest<RecipeResponse[]>(`/api/users/${userId}/recipes`);
    return recipes.map(normalizeRecipe);
  }, mockRecipes);
}

export interface RecipeIngredientInput {
  itemId: string;
  itemName: string; // not sent to the backend, kept for building the mock-fallback echo
  baseQuantity: number;
  unit: string | null;
  /**
   * Feature 3's Store Routing Rule: explicit "Target Store" for this
   * ingredient, chosen in the recipe modal's per-ingredient store picker.
   * null = no override, backend falls back to whichever store currently
   * has the lowest known price for this item (see RecipeService.resolveStore).
   */
  targetStoreId: string | null;
  /** True if this ingredient is optional (garnish, skippable spice, etc.). */
  isOptional: boolean;
}

export interface CreateRecipeInput {
  name: string;
  ingredients: RecipeIngredientInput[];
}

/** POST /api/users/{userId}/recipes - wires up the "+ New recipe" button. */
export async function createRecipe(userId: number, input: CreateRecipeInput): Promise<Recipe> {
  return withMockFallback(
    async () => {
      const r = await apiRequest<RecipeResponse>(`/api/users/${userId}/recipes`, {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          ingredients: input.ingredients.map((ing) => ({
            itemId: Number(ing.itemId),
            baseQuantity: ing.baseQuantity,
            unit: ing.unit,
            targetStoreId: ing.targetStoreId ? Number(ing.targetStoreId) : null,
            isOptional: ing.isOptional,
          })),
        }),
      });
      return normalizeRecipe(r);
    },
    () => ({
      id: `mock-${Date.now()}`,
      name: input.name,
      currentMultiplier: 0,
      ingredients: input.ingredients.map((ing) => ({
        itemId: ing.itemId,
        itemName: ing.itemName,
        category: '',
        baseQuantity: ing.baseQuantity,
        unit: ing.unit,
        defaultStoreId: ing.targetStoreId ?? '',
        defaultStoreName: '',
        defaultPrice: 0,
        isCustomRouted: ing.targetStoreId !== null,
        isOptional: ing.isOptional,
      })),
    })
  );
}

/** PUT /api/users/{userId}/recipes/{recipeId} - edits an existing recipe's name/ingredients. */
export async function updateRecipe(
  userId: number,
  recipeId: string,
  input: CreateRecipeInput
): Promise<Recipe> {
  return withMockFallback(
    async () => {
      const r = await apiRequest<RecipeResponse>(`/api/users/${userId}/recipes/${recipeId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: input.name,
          ingredients: input.ingredients.map((ing) => ({
            itemId: Number(ing.itemId),
            baseQuantity: ing.baseQuantity,
            unit: ing.unit,
            targetStoreId: ing.targetStoreId ? Number(ing.targetStoreId) : null,
            isOptional: ing.isOptional,
          })),
        }),
      });
      return normalizeRecipe(r);
    },
    () => ({
      id: recipeId,
      name: input.name,
      currentMultiplier: 0,
      ingredients: input.ingredients.map((ing) => ({
        itemId: ing.itemId,
        itemName: ing.itemName,
        category: '',
        baseQuantity: ing.baseQuantity,
        unit: ing.unit,
        defaultStoreId: ing.targetStoreId ?? '',
        defaultStoreName: '',
        defaultPrice: 0,
        isCustomRouted: ing.targetStoreId !== null,
        isOptional: ing.isOptional,
      })),
    })
  );
}

/** DELETE /api/users/{userId}/recipes/{recipeId} - deletes a recipe, folding its cart rows into "Others". */
export async function deleteRecipe(userId: number, recipeId: string): Promise<void> {
  return withMockFallback(
    () =>
      apiRequest<void>(
        `/api/users/${userId}/recipes/${recipeId}`,
        { method: 'DELETE' },
        /* expectJson */ false
      ),
    undefined
  );
}

/**
 * PATCH /api/users/{userId}/recipes/{recipeId}/multiplier - the recipe
 * card's +/- multiplier control. Persists the multiplier AND syncs the
 * cart server-side in one call; this replaces the old separate
 * "Add to cart" button entirely.
 */
export async function updateMultiplier(
  userId: number,
  recipeId: string,
  multiplier: number
): Promise<Recipe> {
  return withMockFallback(
    async () => {
      const r = await apiRequest<RecipeResponse>(
        `/api/users/${userId}/recipes/${recipeId}/multiplier`,
        {
          method: 'PATCH',
          body: JSON.stringify({ multiplier }),
        }
      );
      return normalizeRecipe(r);
    },
    () => ({
      id: recipeId,
      name: mockRecipes.find((r) => r.id === recipeId)?.name ?? 'Recipe',
      currentMultiplier: multiplier,
      ingredients: mockRecipes.find((r) => r.id === recipeId)?.ingredients ?? [],
    })
  );
}
