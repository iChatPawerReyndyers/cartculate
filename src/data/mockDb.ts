// mockDb.ts
// TESTING ONLY - a mutable, in-memory "mock backend" used by every api/*.ts
// module's withMockFallback() branch when ENABLE_MOCK_FALLBACK is on and
// the real server is unreachable (see api/config.ts and api/httpClient.ts).
//
// WHY THIS EXISTS
// Previously, each mock fallback returned a snapshot straight from a
// mock*Data.ts file (or, for mutations, just echoed back whatever the UI
// sent, or did nothing at all). That's fine for a single call, but it means
// nothing was ever actually stored: e.g. bumping a cart item's quantity
// while offline would look like it worked (the UI's optimistic update
// covers that up), but the moment anything re-fetched from "the backend" -
// pull-to-refresh, switching tabs and back, remounting a screen - the
// change would be gone, because fetchCart() was still just handing back
// the same pristine mockCartRows array every time.
//
// This module fixes that by holding ONE mutable snapshot of each mock
// dataset for the lifetime of the app process, seeded once from the
// existing mock*Data.ts files, plus small helper functions that actually
// mutate it. The api/*.ts modules call these instead of returning static
// data or no-ops, so cart/recipe/price-catalog/purchase changes now
// persist for the rest of an offline session - enough to click through
// full user flows for local QA without a backend running at all.
//
// NOT a real database:
// - Nothing survives an app reload/reinstall (it's just a JS module-level
//   object, reset whenever the JS engine restarts).
// - IDs are generated locally (`mock-<kind>-<n>`) and never collide with
//   real backend IDs, but also never validate against anything.
// - Recipe -> cart syncing (see syncCartForRecipe) is a reasonable
//   approximation of what the real
//   PATCH /api/users/{userId}/recipes/{recipeId}/multiplier endpoint does,
//   not a guaranteed match to backend behavior.
// Its only job is to make ENABLE_MOCK_FALLBACK=true feel like a real,
// statable backend for manual testing. Set ENABLE_MOCK_FALLBACK=false in
// api/config.ts to stop using it entirely and talk to the real backend.

import { CartRow, Recipe, RecipeIngredient, PurchaseReceipt, ManifestItem, Item, UserMode, CategoryDefaultStore } from '../types';
import type { Store } from '../api/storeApi';
import type { StorePriceEntry } from '../api/storePriceApi';

import { mockCartRows as seedCartRows } from './mockCartData';
import { mockRecipes as seedRecipes } from './mockRecipeData';
import { mockPurchaseReceipts as seedPurchaseReceipts } from './mockPurchaseHistory';
import { mockItems as seedItems } from './mockItemData';
import { mockStores as seedStores } from './mockStoreData';
import { mockAllPrices as seedStorePrices } from './mockStorePriceData';

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Single mutable snapshot, seeded once per app process from the existing
// mock*Data.ts files. Deep-copied on seed so mutating `db` never touches
// the original seed arrays (helpful if the app is ever hot-reloaded).
const db = {
  cartRows: deepCopy(seedCartRows) as CartRow[],
  recipes: deepCopy(seedRecipes) as Recipe[],
  purchaseReceipts: deepCopy(seedPurchaseReceipts) as PurchaseReceipt[],
  items: deepCopy(seedItems) as Item[],
  stores: deepCopy(seedStores) as Store[],
  storePrices: deepCopy(seedStorePrices) as StorePriceEntry[],
  userMode: 'HOME' as UserMode,
  // category name -> storeId. Only affects NEW items created in that
  // category from here on (see dbCreateItem) - never retroactive.
  categoryDefaultStores: {} as Record<string, string>,
};

let idCounter = 1000; // seed data uses small ids like "1", "2" - keep mock-generated ids clearly distinct
function nextId(prefix: string): string {
  idCounter += 1;
  return `mock-${prefix}-${idCounter}`;
}

// ─── Items ──────────────────────────────────────────────────────────────

export function dbGetItems(): Item[] {
  return deepCopy(db.items);
}

export function dbFindItem(itemId: string): Item | undefined {
  return db.items.find((i) => i.id === itemId);
}

/**
 * unit e.g. "kg", "pack", "pc" - feeds Feature 1's Pricing Format rule
 * (itemName (unit)). Pass null for items with no natural unit label.
 * isIngredient controls whether this item shows up in the Recipe modal's
 * ingredient picker.
 *
 * defaultStoreId: pass undefined to auto-fill from this category's
 * configured default store (if any - see dbSetCategoryDefaultStore), pass
 * a real store id for an explicit override, or pass null for "no default
 * at all, not even the category's".
 */
export function dbCreateItem(
  name: string,
  category: string,
  unit: string | null,
  isIngredient: boolean,
  defaultStoreId?: string | null
): Item {
  const resolvedDefaultStoreId =
    defaultStoreId !== undefined ? defaultStoreId : db.categoryDefaultStores[category] ?? null;
  const item: Item = {
    id: nextId('item'),
    name,
    category,
    unit,
    isIngredient,
    defaultStoreId: resolvedDefaultStoreId,
  };
  db.items.push(item);
  return deepCopy(item);
}

/**
 * Edits an existing item. Unlike dbCreateItem, editing never re-derives
 * defaultStoreId from the category default - that pre-fill only happens
 * once, at creation. Pass defaultStoreId as undefined to leave the item's
 * current default untouched, null to clear it, or a store id to set/change
 * an explicit override.
 */
export function dbUpdateItem(
  itemId: string,
  name: string,
  category: string,
  unit: string | null,
  isIngredient: boolean,
  defaultStoreId?: string | null
): Item {
  const existing = db.items.find((i) => i.id === itemId);
  if (existing) {
    existing.name = name;
    existing.category = category;
    existing.unit = unit;
    existing.isIngredient = isIngredient;
    if (defaultStoreId !== undefined) existing.defaultStoreId = defaultStoreId;
    // Keep denormalized copies of the name/category/unit in sync elsewhere,
    // the way a real backend's cascading update would.
    for (const row of db.cartRows) {
      if (row.itemId === itemId) {
        row.itemName = name;
        row.category = category;
        row.unit = unit;
      }
    }
    for (const price of db.storePrices) {
      if (price.itemId === itemId) price.itemName = name;
    }
    return deepCopy(existing);
  }
  const created: Item = {
    id: itemId,
    name,
    category,
    unit,
    isIngredient,
    defaultStoreId: defaultStoreId ?? null,
  };
  db.items.push(created);
  return deepCopy(created);
}

// ─── Stores ─────────────────────────────────────────────────────────────

export function dbGetStores(): Store[] {
  return deepCopy(db.stores);
}

export function dbFindStore(storeId: string): Store | undefined {
  return db.stores.find((s) => s.id === storeId);
}

/** Mirrors StoreService.createStore() on the real backend: reuses an existing store (case-insensitive name match) instead of creating a duplicate. */
export function dbCreateStore(name: string): Store {
  const trimmed = name.trim();
  const existing = db.stores.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return deepCopy(existing);

  const store: Store = { id: nextId('store'), name: trimmed };
  db.stores.push(store);
  return deepCopy(store);
}

// ─── Category default stores ───────────────────────────────────────────
// New products created in a category are pre-filled with this as their
// own Item.defaultStoreId (see dbCreateItem above). Purely a creation-time
// convenience - changing a category's default never touches any item
// that already exists, and an item's own explicit default always takes
// priority over this once set (see resolveDefaultStoreFor below).

export function dbGetCategoryDefaultStores(): CategoryDefaultStore[] {
  return Object.entries(db.categoryDefaultStores).map(([category, storeId]) => {
    const store = dbFindStore(storeId);
    return { category, storeId, storeName: store?.name ?? 'Unknown store' };
  });
}

export function dbSetCategoryDefaultStore(category: string, storeId: string): CategoryDefaultStore {
  db.categoryDefaultStores[category] = storeId;
  const store = dbFindStore(storeId);
  return { category, storeId, storeName: store?.name ?? 'Unknown store' };
}

export function dbClearCategoryDefaultStore(category: string): void {
  delete db.categoryDefaultStores[category];
}

// ─── Store prices ───────────────────────────────────────────────────────

export function dbGetStorePrices(): StorePriceEntry[] {
  return deepCopy(db.storePrices);
}

export function dbDeletePrice(storeId: string, itemId: string): void {
  db.storePrices = db.storePrices.filter((p) => !(p.storeId === storeId && p.itemId === itemId));
}

export function dbUpsertStorePrices(
  storeId: string,
  updates: { itemId: string; priceAmount: number }[]
): StorePriceEntry[] {
  const store = dbFindStore(storeId);
  const storeName = store?.name ?? 'Unknown store';
  const results: StorePriceEntry[] = [];

  for (const update of updates) {
    const item = dbFindItem(update.itemId);
    const itemName = item?.name ?? `Item ${update.itemId}`;
    const existing = db.storePrices.find((p) => p.storeId === storeId && p.itemId === update.itemId);
    if (existing) {
      existing.priceAmount = update.priceAmount;
      existing.itemName = itemName;
      existing.storeName = storeName;
      results.push(existing);
    } else {
      const created: StorePriceEntry = {
        itemId: update.itemId,
        itemName,
        storeId,
        storeName,
        priceAmount: update.priceAmount,
      };
      db.storePrices.push(created);
      results.push(created);
    }
  }
  return deepCopy(results);
}

/** Picks the cheapest known store price for an item - the last-resort fallback when an item has no default store (or its default store has no known price for it). */
function cheapestPriceFor(itemId: string): StorePriceEntry | undefined {
  const candidates = db.storePrices.filter((p) => p.itemId === itemId);
  if (candidates.length === 0) return undefined;
  return candidates.reduce((best, p) => (p.priceAmount < best.priceAmount ? p : best));
}

/**
 * Resolves which store a recipe ingredient auto-routes to when left on
 * "Default (auto)" (no explicit per-ingredient override chosen in the
 * recipe modal). Priority:
 *   1. The ITEM's own defaultStoreId, if set AND that store has a known
 *      price for the item - an explicit override on the Price Catalog's
 *      product form always wins, per spec.
 *   2. Otherwise, whichever store has the cheapest known price (the
 *      original behavior), same as before this feature existed.
 */
function resolveDefaultStoreFor(itemId: string): StorePriceEntry | undefined {
  const item = dbFindItem(itemId);
  if (item?.defaultStoreId) {
    const atItemDefault = db.storePrices.find(
      (p) => p.itemId === itemId && p.storeId === item.defaultStoreId
    );
    if (atItemDefault) return atItemDefault;
  }
  return cheapestPriceFor(itemId);
}

// ─── Recipes ────────────────────────────────────────────────────────────

export function dbGetRecipes(): Recipe[] {
  return deepCopy(db.recipes);
}

interface IngredientInput {
  itemId: string;
  itemName: string;
  baseQuantity: number;
  unit: string | null;
  isOptional?: boolean;
}

function buildRecipeIngredient(input: IngredientInput): RecipeIngredient {
  const item = dbFindItem(input.itemId);
  const priceEntry = resolveDefaultStoreFor(input.itemId);
  return {
    itemId: input.itemId,
    itemName: item?.name ?? input.itemName,
    category: item?.category ?? '',
    baseQuantity: input.baseQuantity,
    unit: input.unit,
    defaultStoreId: priceEntry?.storeId ?? '',
    defaultStoreName: priceEntry?.storeName ?? 'Unknown store',
    defaultPrice: priceEntry?.priceAmount ?? 0,
    isCustomRouted: false,
    isOptional: input.isOptional ?? false,
  };
}

export function dbCreateRecipe(name: string, ingredients: IngredientInput[]): Recipe {
  const recipe: Recipe = {
    id: nextId('recipe'),
    name,
    currentMultiplier: 0,
    ingredients: ingredients.map(buildRecipeIngredient),
  };
  db.recipes.push(recipe);
  return deepCopy(recipe);
}

export function dbUpdateRecipe(recipeId: string, name: string, ingredients: IngredientInput[]): Recipe {
  const existing = db.recipes.find((r) => r.id === recipeId);
  const updated: Recipe = {
    id: recipeId,
    name,
    currentMultiplier: existing?.currentMultiplier ?? 0,
    ingredients: ingredients.map(buildRecipeIngredient),
  };

  if (existing) {
    Object.assign(existing, updated);
  } else {
    db.recipes.push(updated);
  }

  // Ingredients (and therefore their store/price routing) may have just
  // changed, so re-sync the cart if this recipe is currently contributing
  // to it.
  if (updated.currentMultiplier > 0) {
    syncCartForRecipe(updated);
  }
  return deepCopy(updated);
}

export function dbDeleteRecipe(recipeId: string): void {
  db.recipes = db.recipes.filter((r) => r.id !== recipeId);
  // Fold this recipe's cart rows into "Others" instead of deleting them,
  // matching the real DELETE endpoint's documented behavior.
  for (const row of db.cartRows) {
    if (row.sourceRecipeId === recipeId) {
      row.sourceRecipeId = null;
      row.sourceRecipeName = null;
    }
  }
}

/**
 * Regenerates a recipe's cart rows to match its current ingredients and
 * multiplier, carrying over pantry-override/checkout state from whichever
 * prior row matched the same item+store, the way the real
 * PATCH .../multiplier endpoint is documented to "sync the cart" in place.
 */
function syncCartForRecipe(recipe: Recipe): void {
  const previousRows = db.cartRows.filter((r) => r.sourceRecipeId === recipe.id);
  db.cartRows = db.cartRows.filter((r) => r.sourceRecipeId !== recipe.id);

  if (recipe.currentMultiplier <= 0) return;

  for (const ing of recipe.ingredients) {
    const scaledQty = Math.round(ing.baseQuantity * recipe.currentMultiplier * 100) / 100;
    if (scaledQty <= 0) continue;
    const carryOver = previousRows.find((r) => r.itemId === ing.itemId && r.storeId === ing.defaultStoreId);
    // The cart row's `unit` reflects the master Item's unit (e.g. "kg",
    // "pack" - Feature 1's Pricing Format), which is a different concept
    // from `ing.unit` (the recipe ingredient's own measurement unit, e.g.
    // "g" for "500g beef cubes") - so look it up from the item catalog
    // rather than reusing ing.unit.
    const masterItem = dbFindItem(ing.itemId);
    db.cartRows.push({
      id: carryOver?.id ?? nextId('cart'),
      itemId: ing.itemId,
      itemName: ing.itemName,
      category: ing.category,
      unit: masterItem?.unit ?? null,
      storeId: ing.defaultStoreId,
      storeName: ing.defaultStoreName,
      price: ing.defaultPrice,
      quantity: scaledQty,
      sourceRecipeId: recipe.id,
      sourceRecipeName: recipe.name,
      overridePantryQty: carryOver?.overridePantryQty ?? 0,
      overrideReason: carryOver?.overrideReason ?? null,
      isCheckedCheckout: carryOver?.isCheckedCheckout ?? false,
    });
  }
}

export function dbUpdateMultiplier(recipeId: string, multiplier: number): Recipe {
  const recipe = db.recipes.find((r) => r.id === recipeId);
  if (!recipe) throw new Error(`mockDb: recipe ${recipeId} not found`);
  recipe.currentMultiplier = multiplier;
  syncCartForRecipe(recipe);
  return deepCopy(recipe);
}

// ─── Cart ───────────────────────────────────────────────────────────────

export function dbGetCartRows(): CartRow[] {
  return deepCopy(db.cartRows);
}

/**
 * Manual +/- taps always adjust the "Others" (non-recipe) row for an
 * item/store first - same rule cartLogic.ts's client-side
 * adjustOthersQuantity() applies optimistically.
 *
 * FIX: previously, if NO "Others" row existed yet (an item sourced
 * entirely from recipes, e.g. an ingredient split across two recipes with
 * nothing manually added) a decrement (delta <= 0) was a silent no-op -
 * there was nothing to decrement and the old code only handled creating a
 * brand-new row for delta > 0. That made "-" on such an item look
 * completely dead, AND meant that even if the client's optimistic update
 * momentarily showed the reduced quantity, the next refetch from this mock
 * backend would snap it right back (since nothing here actually changed).
 * Now a decrement with no Others row falls back to reducing the item's
 * PRIMARY (first matching) row instead, matching the client-side fix in
 * cartLogic.ts's adjustOthersQuantity().
 */
export function dbAdjustCartItem(itemId: string, storeId: string, delta: number): void {
  const idx = db.cartRows.findIndex((r) => r.itemId === itemId && r.storeId === storeId && !r.sourceRecipeId);
  if (idx !== -1) {
    db.cartRows[idx].quantity = Math.max(0, db.cartRows[idx].quantity + delta);
    return;
  }

  if (delta > 0) {
    const template = db.cartRows.find((r) => r.itemId === itemId && r.storeId === storeId);
    const item = dbFindItem(itemId);
    const store = dbFindStore(storeId);
    const priceEntry = db.storePrices.find((p) => p.itemId === itemId && p.storeId === storeId);

    db.cartRows.push({
      id: nextId('cart'),
      itemId,
      itemName: template?.itemName ?? item?.name ?? 'Unknown item',
      category: template?.category ?? item?.category ?? '',
      unit: template?.unit ?? item?.unit ?? null,
      storeId,
      storeName: template?.storeName ?? store?.name ?? 'Unknown store',
      price: template?.price ?? priceEntry?.priceAmount ?? 0,
      quantity: delta,
      sourceRecipeId: null,
      sourceRecipeName: null,
      overridePantryQty: 0,
      overrideReason: null,
      isCheckedCheckout: false,
    });
    return;
  }

  if (delta === 0) return;

  // No "Others" row to decrement - fall back to the primary (first
  // matching) row for this item/store instead of doing nothing.
  const primaryIdx = db.cartRows.findIndex((r) => r.itemId === itemId && r.storeId === storeId);
  if (primaryIdx === -1) return; // nothing at all to decrement from
  db.cartRows[primaryIdx].quantity = Math.max(0, db.cartRows[primaryIdx].quantity + delta);
}

export function dbSetPantryOverride(cartItemId: string, overridePantryQty: number, overrideReason: string | null): CartRow {
  const row = db.cartRows.find((r) => r.id === cartItemId);
  if (!row) throw new Error(`mockDb: cart row ${cartItemId} not found`);
  row.overridePantryQty = overridePantryQty;
  row.overrideReason = overrideReason;
  return deepCopy(row);
}

export function dbSetCheckoutStatus(cartItemId: string, checked: boolean): CartRow {
  const row = db.cartRows.find((r) => r.id === cartItemId);
  if (!row) throw new Error(`mockDb: cart row ${cartItemId} not found`);
  row.isCheckedCheckout = checked;
  return deepCopy(row);
}

/**
 * Feature 5 - Secure Master Hard-Reset Button. Mirrors CartService.masterReset()
 * on the real backend: zeroes every quantity AND clears every pantry
 * override AND resets every recipe's multiplier, not just checkboxes.
 * (Previously this only cleared isCheckedCheckout, which didn't match the
 * spec and drifted from what the real backend now does - see the
 * CartService.java rewrite from earlier in this thread. Name kept as-is
 * since I haven't seen the current cartApi.ts call site - happy to rename
 * to dbMasterReset() if you'd rather, just say the word.)
 */
export function dbMasterResetCheckout(): void {
  for (const row of db.cartRows) {
    row.quantity = 0;
    row.overridePantryQty = 0;
    row.overrideReason = null;
    row.isCheckedCheckout = false;
  }
  for (const recipe of db.recipes) {
    recipe.currentMultiplier = 0;
  }
}

/**
 * `boughtItems` carries how much of each checked item was ACTUALLY bought
 * (keyed by itemId, not row id - a single item can be checked across
 * multiple underlying rows if it's sourced from more than one recipe).
 * Defaults to the full checked quantity for any item not present in the
 * list, preserving the old all-or-nothing behavior as a fallback.
 *
 * For each item, its checked rows are reduced in order by however much of
 * the bought quantity "budget" reaches them - so a partial purchase (e.g.
 * bought 2 of 3 needed) leaves exactly 1 unit remaining across whichever
 * row(s) didn't get fully consumed, instead of always zeroing everything.
 */
export function dbCompleteCheckout(
  storeId: string,
  boughtItems: { itemId: string; quantityBought: number }[] = []
): void {
  const boughtQtyByItemId = new Map<string, number>(boughtItems.map((b) => [b.itemId, b.quantityBought]));
  const affectedRecipeIds = new Set<string>();

  // Away Mode shows a single checkbox per ITEM (not one per recipe
  // source), so isCheckedCheckout=true only ever lives on one
  // representative row per item. Find WHICH items were checked...
  const checkedItemIds = new Set(
    db.cartRows.filter((r) => r.storeId === storeId && r.isCheckedCheckout).map((r) => r.itemId)
  );

  // ...then gather ALL of those items' rows (every recipe source + manual
  // "Others"), since checking an item means "I'm done with this item as a
  // whole" - the bought-quantity distribution needs to span every
  // contributing row, not just whichever one carried the checkbox flag.
  const rowsForCheckedItems = db.cartRows.filter(
    (r) => r.storeId === storeId && checkedItemIds.has(r.itemId)
  );
  const rowsByItemId = new Map<string, typeof rowsForCheckedItems>();
  for (const row of rowsForCheckedItems) {
    if (!rowsByItemId.has(row.itemId)) rowsByItemId.set(row.itemId, []);
    rowsByItemId.get(row.itemId)!.push(row);
  }

  for (const [itemId, rows] of rowsByItemId.entries()) {
    const totalQty = rows.reduce((sum, r) => sum + r.quantity, 0);
    let remainingBought = Math.max(0, boughtQtyByItemId.get(itemId) ?? totalQty);

    for (const row of rows) {
      if (row.sourceRecipeId) affectedRecipeIds.add(row.sourceRecipeId);
      const reduceBy = Math.min(remainingBought, row.quantity);
      row.quantity -= reduceBy;
      remainingBought -= reduceBy;
      row.isCheckedCheckout = false;
    }
  }

  // Unchecked-item handling: recipe-sourced rows at this store for items
  // that were NEVER checked at all (explicitly excludes items handled
  // above - a partially-bought checked item's leftover remainder is still
  // genuinely needed by its recipe, so it must NOT be treated the same as
  // an item the user skipped entirely).
  const uncheckedRecipeRows = db.cartRows.filter(
    (r) =>
      r.storeId === storeId &&
      r.sourceRecipeId !== null &&
      !checkedItemIds.has(r.itemId) &&
      r.quantity > 0
  );
  for (const row of uncheckedRecipeRows) {
    if (row.sourceRecipeId) affectedRecipeIds.add(row.sourceRecipeId);
    const othersRow = db.cartRows.find(
      (r) => r.itemId === row.itemId && r.storeId === storeId && r.sourceRecipeId === null
    );
    if (othersRow) {
      othersRow.quantity += row.quantity;
      db.cartRows = db.cartRows.filter((r) => r !== row);
    } else {
      row.sourceRecipeId = null;
      row.sourceRecipeName = null;
    }
  }

  // Recipe multiplier cascade: if every remaining cart row sourced from a
  // touched recipe is now quantity 0, reset that recipe's multiplier.
  // A partially-bought item leaves some row(s) above 0, so this correctly
  // does NOT cascade for a recipe that still has ingredients left to buy.
  for (const recipeId of affectedRecipeIds) {
    const remaining = db.cartRows.filter((r) => r.sourceRecipeId === recipeId);
    const allResolved = remaining.every((r) => r.quantity === 0);
    if (allResolved) {
      const recipe = db.recipes.find((r) => r.id === recipeId);
      if (recipe) recipe.currentMultiplier = 0;
    }
  }

  // Rule C - One-Time Session Cache Reset: pantry overrides are single-trip
  // session variables. Once this store's trip is committed, clear them for
  // every remaining row at this store.
  for (const row of db.cartRows) {
    if (row.storeId === storeId) {
      row.overridePantryQty = 0;
      row.overrideReason = null;
    }
  }
}

// ─── Purchases ──────────────────────────────────────────────────────────

export function dbGetPurchases(): PurchaseReceipt[] {
  return deepCopy(db.purchaseReceipts);
}

export function dbCreatePurchase(
  storeId: string,
  totalReceiptSpent: number,
  purchaseDate: string,
  items: ManifestItem[]
): PurchaseReceipt {
  const store = dbFindStore(storeId);
  const receipt: PurchaseReceipt = {
    id: nextId('receipt'),
    userId: '1',
    storeId,
    storeName: store?.name ?? 'Unknown store',
    totalReceiptSpent,
    purchaseDate,
    items,
  };
  db.purchaseReceipts.push(receipt);
  return deepCopy(receipt);
}

// ─── User mode ──────────────────────────────────────────────────────────

export function dbGetUserMode(): UserMode {
  return db.userMode;
}

export function dbSetUserMode(mode: UserMode): UserMode {
  db.userMode = mode;
  return db.userMode;
}