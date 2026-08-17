// reconciliationLogic.ts
// Pure functions for the "Done Checkout" trip-conclusion flow (Feature 6).
// Takes the checked-off items for one store and builds what's needed to
// both display the reconciliation screen and submit the confirmed purchase.

import { ConsolidatedItem, ManifestItem } from '../types';

/**
 * The quantity actually being bought = totalQuantity minus whatever's
 * already covered by a pantry override, floored at 0 - same "need to buy"
 * math CartItem.tsx displays.
 */
function needToBuy(item: ConsolidatedItem): number {
  return Math.max(0, item.totalQuantity - item.totalPantryQty);
}

/** Builds the manifest for POST /api/users/{userId}/purchases from checked-off items. */
export function buildExpectedManifest(checkedItems: ConsolidatedItem[]): ManifestItem[] {
  return checkedItems
    .filter((item) => needToBuy(item) > 0)
    .map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      category: item.category,
      quantity: needToBuy(item),
      pricePerUnit: item.price,
    }));
}

/** Expected total = sum(needToBuy * price) across checked-off items, using known Store_Price values. */
export function calculateExpectedTotal(checkedItems: ConsolidatedItem[]): number {
  return checkedItems.reduce((sum, item) => sum + needToBuy(item) * item.price, 0);
}

/**
 * Total for a manifest that may have been edited by the reconciliation
 * modal's "qty actually bought" and/or per-item price fields - used to
 * recompute the expected total against what was ACTUALLY bought, rather
 * than the original full need, once those edits are in play.
 */
export function calculateManifestTotal(manifest: ManifestItem[]): number {
  return manifest.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);
}

export interface PriceVariance {
  amount: number; // actualTotal - expectedTotal (positive = receipt was higher)
  hasVariance: boolean; // true if the difference exceeds a small rounding tolerance
}

/** Compares the user-entered actual receipt total against the expected total. */
export function calculateVariance(actualTotal: number, expectedTotal: number): PriceVariance {
  const amount = Math.round((actualTotal - expectedTotal) * 100) / 100;
  return {
    amount,
    hasVariance: Math.abs(amount) > 0.01, // ignore sub-centavo rounding noise
  };
}

/**
 * Feature 6's "Checkout Race" mini-game: true if the user's entered receipt
 * total lands within a 5% margin of the app's pre-calculated estimate,
 * awarding the playful "Cart Wizard" badge. When expectedTotal is 0 (e.g.
 * an all-free/promo trip), only an exact 0 counts as a match - a percentage
 * margin is meaningless against a zero baseline.
 */
export function isCartWizardMatch(actualTotal: number, expectedTotal: number): boolean {
  if (expectedTotal <= 0) return actualTotal === 0;
  return Math.abs(actualTotal - expectedTotal) / expectedTotal <= 0.05;
}
