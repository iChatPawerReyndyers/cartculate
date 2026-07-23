// types/index.ts
// Shared domain types, mirroring the ER entities in the spec
// (Item, Store, Store_Price, User_Cart_Item, Recipe, Recipe_Ingredient).

/** A single raw row as stored/fetched per user cart entry (User_Cart_Item). */
export interface CartRow {
  id: string;
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  price: number;
  quantity: number;
  sourceRecipeId: string | null;
  sourceRecipeName: string | null;
}

/** One entry in a consolidated item's source breakdown (accordion row). */
export interface BreakdownEntry {
  label: string;
  quantity: number;
  sourceRecipeId: string | null;
}

/** A single item, consolidated across all its source rows for one store. */
export interface ConsolidatedItem {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  price: number;
  totalQuantity: number;
  breakdown: BreakdownEntry[];
}

/** A store section on the Cart screen, with its active (qty > 0) items. */
export interface StoreGroup {
  storeId: string;
  storeName: string;
  items: ConsolidatedItem[];
}

/** Result of consolidateCart(): active store sections + excluded (qty 0) items. */
export interface ConsolidateCartResult {
  stores: StoreGroup[];
  excludedItems: ConsolidatedItem[];
}

/** A single ingredient line on a saved Recipe (Recipe_Ingredient). */
export interface RecipeIngredient {
  itemId: string;
  itemName: string;
  baseQuantity: number;
  unit: string | null;
  defaultStoreId: string;
  defaultStoreName: string;
  defaultPrice: number;
}

/** An ingredient after scaleIngredients() has applied the recipe's scale factor. */
export interface ScaledIngredient extends RecipeIngredient {
  scaledQuantity: number;
}

/** A saved recipe (Recipe entity + its Recipe_Ingredient rows). */
export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
}

/** Valid scale factor options exposed in the Recipe tab's picker. */
export type ScaleFactor = 0.5 | 1 | 2;