// cartLogic.ts
// Pure functions for consolidating User_Cart_Item rows into the grouped,
// store-sectioned shape the main Cart screen renders.

import { CartRow, ConsolidatedItem, ConsolidateCartResult, StoreGroup } from '../types';

interface StoreAccumulator {
  storeId: string;
  storeName: string;
  items: Map<string, ConsolidatedItem>;
}

/**
 * Groups raw cart rows by store, then by item, aggregating quantities
 * and building the breakdown list used by the expandable accordion.
 */
export function consolidateCart(cartRows: CartRow[]): ConsolidateCartResult {
  const storeMap = new Map<string, StoreAccumulator>();

  for (const row of cartRows) {
    if (!storeMap.has(row.storeId)) {
      storeMap.set(row.storeId, {
        storeId: row.storeId,
        storeName: row.storeName,
        items: new Map(),
      });
    }
    const store = storeMap.get(row.storeId)!;

    if (!store.items.has(row.itemId)) {
      store.items.set(row.itemId, {
        itemId: row.itemId,
        itemName: row.itemName,
        storeId: row.storeId,
        storeName: row.storeName,
        price: row.price,
        totalQuantity: 0,
        breakdown: [],
      });
    }
    const item = store.items.get(row.itemId)!;

    const label = row.sourceRecipeId ? row.sourceRecipeName ?? 'Others' : 'Others';
    const existingBreakdown = item.breakdown.find(
      (b) => b.sourceRecipeId === row.sourceRecipeId
    );

    if (existingBreakdown) {
      existingBreakdown.quantity += row.quantity;
    } else {
      item.breakdown.push({
        label,
        quantity: row.quantity,
        sourceRecipeId: row.sourceRecipeId ?? null,
      });
    }
    item.totalQuantity += row.quantity;
  }

  const stores: StoreGroup[] = [];
  const excludedItems: ConsolidatedItem[] = [];

  for (const store of storeMap.values()) {
    const activeItems: ConsolidatedItem[] = [];
    for (const item of store.items.values()) {
      if (item.totalQuantity === 0) {
        excludedItems.push(item);
      } else {
        activeItems.push(item);
      }
    }
    if (activeItems.length > 0) {
      stores.push({
        storeId: store.storeId,
        storeName: store.storeName,
        items: activeItems,
      });
    }
  }

  return { stores, excludedItems };
}

/** Grand total = sum(totalQuantity * price) across all active (non-excluded) items. */
export function calculateGrandTotal(stores: StoreGroup[]): number {
  let total = 0;
  for (const store of stores) {
    for (const item of store.items) {
      total += item.totalQuantity * item.price;
    }
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
    };
    return [...cartRows, newRow];
  }

  const updated = [...cartRows];
  const newQty = Math.max(0, updated[idx].quantity + delta);
  updated[idx] = { ...updated[idx], quantity: newQty };
  return updated;
}