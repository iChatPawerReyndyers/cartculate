// types/index.ts
// Shared domain types, mirroring the ER entities in the spec
// (Item, Store, Store_Price, User_Cart_Item, Recipe, Recipe_Ingredient).

/** A single entry in the master item catalog (Item entity), used by pickers. */
export interface Item {
  id: string;
  name: string;
  category: string;
  /** e.g. "kg", "pack", "pc" - null means no unit suffix shown. Feeds Feature 1's Pricing Format rule. */
  unit: string | null;
}

/** Which mode the Cart screen is in: HOME = editing pantry overrides, AWAY = mid grocery-trip checkout. */
export type UserMode = 'HOME' | 'AWAY';

/** A single raw row as stored/fetched per user cart entry (User_Cart_Item). */
export interface CartRow {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  /** e.g. "kg", "pack", "pc" - null means no unit suffix shown. Feeds Feature 1's Pricing Format rule. */
  unit: string | null;
  storeId: string;
  storeName: string;
  price: number;
  quantity: number;
  sourceRecipeId: string | null;
  sourceRecipeName: string | null;
  /** Aggregate amount already available at home, subtracted from the "need to buy" total. */
  overridePantryQty: number;
  /** Free-text/emoji tag context for the pantry override, e.g. "Freezer Find". */
  overrideReason: string | null;
  /** Checkbox state during "Start Grocery" (Away Mode) trip mode. */
  isCheckedCheckout: boolean;
}

/** One entry in a consolidated item's source breakdown (accordion row). */
export interface BreakdownEntry {
  label: string;
  quantity: number;
  sourceRecipeId: string | null;
  /** The underlying CartRow.id this breakdown entry came from. */
  rowId: string;
  /** This specific source row's pantry override - not the item-level total. */
  overridePantryQty: number;
  overrideReason: string | null;
  /** This specific source row's checkout checkbox state. */
  isCheckedCheckout: boolean;
}

/** A single item, consolidated across all its source rows for one store. */
export interface ConsolidatedItem {
  itemId: string;
  itemName: string;
  category: string;
  /** e.g. "kg", "pack", "pc" - null means no unit suffix shown. Feeds Feature 1's Pricing Format rule. */
  unit: string | null;
  storeId: string;
  storeName: string;
  price: number;
  totalQuantity: number;
  breakdown: BreakdownEntry[];
  /** Sum of overridePantryQty across every contributing row - "already have" total for Home Mode. */
  totalPantryQty: number;
  /**
   * True only if every contributing row is checked off (Away Mode). For
   * items sourced from a single row (the common case) this is exact; for
   * items split across multiple recipes/sources, toggling only affects
   * primaryRowId - see the TODO on that field.
   */
  isCheckedCheckout: boolean;
  /**
   * Which underlying row the item-level pantry-override/checkout controls
   * apply to, used only when the item has a single source (no breakdown
   * accordion). Prefers the manual "Others" row (sourceRecipeId null) if
   * one exists, otherwise falls back to the first contributing row.
   * When an item has multiple sources, per-source controls live on each
   * `breakdown` entry instead (its own overridePantryQty/isCheckedCheckout),
   * so this field isn't used for the multi-source case.
   */
  primaryRowId: string | null;
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

/**
 * Result of groupByStatus() - Feature 2's Section Order Grid Layout.
 * Every (item, store) line falls into exactly one bucket:
 * itemsToBuy (still need more), stillAtHome (fully pantry-covered), or
 * excluded (raw quantity 0).
 */
export interface CartStatusGroups {
  itemsToBuy: ConsolidatedItem[];
  stillAtHome: ConsolidatedItem[];
  excluded: ConsolidatedItem[];
}

/** A single ingredient line on a saved Recipe (Recipe_Ingredient). */
export interface RecipeIngredient {
  itemId: string;
  itemName: string;
  category: string;
  baseQuantity: number;
  unit: string | null;
  defaultStoreId: string;
  defaultStoreName: string;
  defaultPrice: number;
  /** True if defaultStoreId came from an explicit custom route, false if it's the cheapest-price fallback. */
  isCustomRouted: boolean;
  /** True if this ingredient is optional (garnish, skippable spice, etc.) - excluded from Feature 2's "recipe needs this much" floor. */
  isOptional: boolean;
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
  /** Scaler tracked directly on the recipe card (e.g. "x2" via +/- buttons). */
  currentMultiplier: number;
}

/** Valid scale factor options exposed in the Recipe tab's picker. */
export type ScaleFactor = 0.5 | 1 | 2;

/** One item entry inside a receipt's item_manifest_json snapshot. */
export interface ManifestItem {
  itemId: string;
  itemName: string;
  category: string;
  quantity: number;
  pricePerUnit: number;
}

/**
 * One archived RECEIPT (not one line item - the updated spec moved
 * Purchase_History to receipt-level: one row per checkout, with a JSON
 * manifest of what was in it, rather than one row per item purchased).
 */
export interface PurchaseReceipt {
  id: string;
  userId: string;
  storeId: string;
  storeName: string;
  totalReceiptSpent: number;
  purchaseDate: string; // ISO date string
  /** Parsed from the backend's itemManifestJson string. */
  items: ManifestItem[];
}

/** Monthly budget tracking: user-set limit vs. actual spend to date. */
export interface BudgetSummary {
  monthLabel: string;
  budgetLimit: number;
  amountSpent: number;
}

/** One bar in the store-by-store spending comparison chart. */
export interface StoreSpendingTotal {
  storeId: string;
  storeName: string;
  totalSpent: number;
}

/** One slice in the spending-by-category pie chart. */
export interface CategorySpending {
  category: string;
  amountSpent: number;
  percentage: number;
}

/** One point on the price-trend line graph for a specific item at a specific store. */
export interface PriceTrendPoint {
  monthLabel: string;
  price: number;
}

/** One candidate match the AI offered for a receipt line, for the review dropdown. */
export interface ReceiptItemMatch {
  itemId: string;
  itemName: string;
}

/**
 * One parsed line from a scanned receipt, as returned by the backend's
 * OCR + LLM matching endpoint (POST /api/receipts/scan).
 */
export interface ReceiptLineItem {
  id: string;
  rawText: string; // e.g. "JHNSN CTNBD 200" - the raw OCR shorthand
  matchedItemId: string;
  matchedItemName: string; // e.g. "Johnson's Cottonbuds 200s"
  category: string; // pulled from the matched item's master category
  quantity: number;
  pricePerUnit: number;
  needsReview: boolean; // false = high-confidence match, true = ambiguous
  alternativeMatches: ReceiptItemMatch[]; // other candidates, shown in the review dropdown
}

/** Full response from scanning one receipt image. */
export interface ReceiptScanResult {
  id: string;
  storeId: string;
  storeName: string;
  scannedAt: string; // ISO timestamp
  lineItems: ReceiptLineItem[];
}