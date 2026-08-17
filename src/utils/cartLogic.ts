// cartLogic.ts
// Pure functions for consolidating User_Cart_Item rows into the shapes the
// Cart screen renders. Two grouping modes share the same underlying
// per-(item,store) aggregation: "by store" (Puregold/S&R sections) and
// "by status" (Items to Buy / Still Available at Home / Excluded Items,
// per Feature 2's Section Order Grid Layout requirement).

import { CartRow, ConsolidatedItem, ConsolidateCartResult, StoreGroup, CartStatusGroups } from '../types';

/**
 * Builds one ConsolidatedItem per (item, store) pair, aggregating quantities
 * across every source (recipes + manual "Others") and building the
 * breakdown list used by the expandable accordion. This is the shared
 * aggregation step both groupByStore() and groupByStatus() bucket further.
 */
function buildConsolidatedItems(cartRows: CartRow[]): ConsolidatedItem[] {
  const key = (itemId: string, storeId: string) => `${itemId}::${storeId}`;
  const itemMap = new Map<string, ConsolidatedItem>();

  for (const row of cartRows) {
    const mapKey = key(row.itemId, row.storeId);

    if (!itemMap.has(mapKey)) {
      itemMap.set(mapKey, {
        itemId: row.itemId,
        itemName: row.itemName,
        category: row.category,
        unit: row.unit,
        storeId: row.storeId,
        storeName: row.storeName,
        price: row.price,
        totalQuantity: 0,
        breakdown: [],
        totalPantryQty: 0,
        isCheckedCheckout: true, // starts true, ANDed down to false if any row isn't checked
        primaryRowId: null,
      });
    }
    const item = itemMap.get(mapKey)!;

    const label = row.sourceRecipeId ? row.sourceRecipeName ?? 'Others' : 'Others';
    const existingBreakdown = item.breakdown.find(
      (b) => b.sourceRecipeId === row.sourceRecipeId
    );

    if (existingBreakdown) {
      existingBreakdown.quantity += row.quantity;
      existingBreakdown.overridePantryQty += row.overridePantryQty;
      existingBreakdown.isCheckedCheckout = existingBreakdown.isCheckedCheckout && row.isCheckedCheckout;
    } else {
      item.breakdown.push({
        label,
        quantity: row.quantity,
        sourceRecipeId: row.sourceRecipeId ?? null,
        rowId: row.id,
        overridePantryQty: row.overridePantryQty,
        overrideReason: row.overrideReason,
        isCheckedCheckout: row.isCheckedCheckout,
      });
    }
    item.totalQuantity += row.quantity;
    item.totalPantryQty += row.overridePantryQty;
    item.isCheckedCheckout = item.isCheckedCheckout && row.isCheckedCheckout;

    // Prefer the manual "Others" row as the target for pantry-override/
    // checkout actions; otherwise fall back to whichever row arrived first.
    if (row.sourceRecipeId === null || item.primaryRowId === null) {
      item.primaryRowId = row.id;
    }
  }

  return Array.from(itemMap.values());
}

/** "By store" grouping - Puregold/S&R sections, used by Away Mode and the "By Store" view toggle in Home Mode. */
export function consolidateCart(cartRows: CartRow[]): ConsolidateCartResult {
  const flatItems = buildConsolidatedItems(cartRows);
  const storeMap = new Map<string, StoreGroup>();
  const excludedItems: ConsolidatedItem[] = [];

  for (const item of flatItems) {
    if (item.totalQuantity === 0) {
      excludedItems.push(item);
      continue;
    }
    if (!storeMap.has(item.storeId)) {
      storeMap.set(item.storeId, { storeId: item.storeId, storeName: item.storeName, items: [] });
    }
    storeMap.get(item.storeId)!.items.push(item);
  }

  return { stores: Array.from(storeMap.values()), excludedItems };
}

/**
 * "By status" grouping (Feature 2's Section Order Grid Layout) - buckets
 * every (item, store) line into exactly one of three sections regardless
 * of which store it's at:
 *   - Items to Buy: still need to purchase more than 0 of this item.
 *   - Still Available at Home: fully covered by pantry stock (need-to-buy is 0,
 *     but the raw quantity isn't 0 - distinct from Excluded).
 *   - Excluded Items: raw quantity is 0 (same rule as consolidateCart's excludedItems).
 */
export function groupByStatus(cartRows: CartRow[]): CartStatusGroups {
  const flatItems = buildConsolidatedItems(cartRows);
  const itemsToBuy: ConsolidatedItem[] = [];
  const stillAtHome: ConsolidatedItem[] = [];
  const excluded: ConsolidatedItem[] = [];

  for (const item of flatItems) {
    const needToBuy = Math.max(0, item.totalQuantity - item.totalPantryQty);
    if (item.totalQuantity === 0) {
      excluded.push(item);
    } else if (needToBuy === 0) {
      stillAtHome.push(item);
    } else {
      itemsToBuy.push(item);
    }
  }

  return { itemsToBuy, stillAtHome, excluded };
}

/** Grand total = sum(totalQuantity * price) across a flat list of active (non-excluded) items. */
export function calculateGrandTotal(items: ConsolidatedItem[]): number {
  let total = 0;
  for (const item of items) {
    total += item.totalQuantity * item.price;
  }
  return total;
}

/**
 * Applies a +1 / -1 delta to an item's "Others" bucket. Manual taps on the
 * main screen always adjust "Others", per spec (standalone quantities are
 * tracked separately from recipe-sourced ones).
 */
export function adjustOthersQuantity(
  cartRows: CartRow[],
  itemId: string,
  storeId: string,
  delta: number
): CartRow[] {
  const idx = cartRows.findIndex(
    (r) => r.itemId === itemId && r.storeId === storeId && !r.sourceRecipeId
  );

  if (idx === -1) {
    if (delta <= 0) return cartRows; // nothing to decrement
    const template = cartRows.find(
      (r) => r.itemId === itemId && r.storeId === storeId
    );
    if (!template) return cartRows;
    const newRow: CartRow = {
      ...template,
      id: `${itemId}-${storeId}-others`,
      sourceRecipeId: null,
      sourceRecipeName: null,
      quantity: delta,
      overridePantryQty: 0,
      overrideReason: null,
      isCheckedCheckout: false,
    };
    return [...cartRows, newRow];
  }

  const updated = [...cartRows];
  const newQty = Math.max(0, updated[idx].quantity + delta);
  updated[idx] = { ...updated[idx], quantity: newQty };
  return updated;
}

/** One category's active items, for Home Mode's "By Category" view. */
export interface CategoryGroup {
  category: string;
  items: ConsolidatedItem[];
}

/**
 * Home Mode's "By Category" view - groups active (non-excluded) items by
 * their catalog category across all stores, so e.g. every Vegetable shows
 * together regardless of which store it's cheapest at. Excluded (qty 0)
 * items are left out here, same convention as consolidateCart()'s store
 * grouping - they're shown separately via CartExcludedSection.
 */
export function groupByCategory(cartRows: CartRow[]): CategoryGroup[] {
  const flatItems = buildConsolidatedItems(cartRows);
  const active = flatItems.filter((item) => item.totalQuantity > 0);

  const map = new Map<string, ConsolidatedItem[]>();
  for (const item of active) {
    const key = item.category || 'Uncategorized';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  return Array.from(map.entries())
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.itemName.localeCompare(b.itemName)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}


export interface CatalogItemWithPrice {
  itemId: string;
  itemName: string;
  category: string;
  unit: string | null;
  storeId: string;
  storeName: string;
  price: number;
}

/**
 * Home Mode's "show literally all registered products" feature: builds
 * synthetic qty-0 ConsolidatedItem entries for every catalog item (with a
 * known store price) that doesn't already have a real cart row - so the
 * Excluded section shows every priced product, not just ones already
 * explicitly added via a recipe or a manual "+".
 *
 * These deliberately get `primaryRowId: null` (no real UserCartItem exists
 * for them yet) rather than a fake row id - CartItem.tsx already treats a
 * null primaryRowId as "don't show the pantry control", which is exactly
 * right here (there's no real row to attach a pantry override to until the
 * item is actually added). Pressing "+" still works fine regardless, since
 * onIncrement only ever needs itemId/storeId, never an existing row.
 */
export function buildMissingCatalogItems(
  cartRows: CartRow[],
  catalogEntries: CatalogItemWithPrice[]
): ConsolidatedItem[] {
  const existingKeys = new Set(cartRows.map((r) => `${r.itemId}::${r.storeId}`));

  return catalogEntries
    .filter((entry) => !existingKeys.has(`${entry.itemId}::${entry.storeId}`))
    .map((entry) => ({
      itemId: entry.itemId,
      itemName: entry.itemName,
      category: entry.category,
      unit: entry.unit,
      storeId: entry.storeId,
      storeName: entry.storeName,
      price: entry.price,
      totalQuantity: 0,
      breakdown: [],
      totalPantryQty: 0,
      isCheckedCheckout: false,
      primaryRowId: null,
    }));
}