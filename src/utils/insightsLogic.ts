// insightsLogic.ts
// Pure functions for the Smart Insights & Statistics tab. Purchase_History
// is now receipt-level (one row per checkout with a JSON item manifest,
// not one row per item) - these functions flatten receipts' manifests back
// out into per-item shapes where a chart needs that granularity (category
// breakdown, price trend), while store/budget totals use totalReceiptSpent
// directly since that's already receipt-level and needs no flattening.

import {
  PurchaseReceipt,
  ManifestItem,
  BudgetSummary,
  StoreSpendingTotal,
  CategorySpending,
  PriceTrendPoint,
} from '../types';

/** Total spent = sum(totalReceiptSpent) across all given receipts. */
export function calculateTotalSpent(receipts: PurchaseReceipt[]): number {
  return receipts.reduce((sum, r) => sum + r.totalReceiptSpent, 0);
}

/**
 * Filters receipts to the given calendar month (YYYY-MM) and builds the
 * budget summary used by the progress bar.
 */
export function buildBudgetSummary(
  receipts: PurchaseReceipt[],
  monthKey: string, // e.g. "2026-07"
  monthLabel: string, // e.g. "July 2026"
  budgetLimit: number
): BudgetSummary {
  const monthReceipts = receipts.filter((r) => r.purchaseDate.startsWith(monthKey));
  return {
    monthLabel,
    budgetLimit,
    amountSpent: calculateTotalSpent(monthReceipts),
  };
}

/** Groups spend by store for the store-comparison bar chart - uses totalReceiptSpent directly, no manifest parsing needed. */
export function buildStoreSpendingTotals(receipts: PurchaseReceipt[]): StoreSpendingTotal[] {
  const totals = new Map<string, StoreSpendingTotal>();

  for (const r of receipts) {
    if (!totals.has(r.storeId)) {
      totals.set(r.storeId, { storeId: r.storeId, storeName: r.storeName, totalSpent: 0 });
    }
    totals.get(r.storeId)!.totalSpent += r.totalReceiptSpent;
  }

  return Array.from(totals.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}

/** Flattens every receipt's manifest into a single list of (receipt date, item) pairs. */
function flattenManifestItems(
  receipts: PurchaseReceipt[]
): { purchaseDate: string; item: ManifestItem }[] {
  const flattened: { purchaseDate: string; item: ManifestItem }[] = [];
  for (const receipt of receipts) {
    for (const item of receipt.items) {
      flattened.push({ purchaseDate: receipt.purchaseDate, item });
    }
  }
  return flattened;
}

/**
 * Groups spend by category and computes percentage share for the pie chart.
 * Requires flattening each receipt's manifest, since category lives at the
 * item level, not the receipt level.
 */
export function buildCategoryBreakdown(receipts: PurchaseReceipt[]): CategorySpending[] {
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const { item } of flattenManifestItems(receipts)) {
    const amount = item.quantity * item.pricePerUnit;
    totals.set(item.category, (totals.get(item.category) ?? 0) + amount);
    grandTotal += amount;
  }

  return Array.from(totals.entries())
    .map(([category, amountSpent]) => ({
      category,
      amountSpent,
      percentage: grandTotal === 0 ? 0 : Math.round((amountSpent / grandTotal) * 100),
    }))
    .sort((a, b) => b.amountSpent - a.amountSpent);
}

/**
 * Builds the price-trend line for one item, one point per calendar month,
 * averaging same-month purchases if there's more than one. NOTE: the
 * updated manifest schema doesn't record which store each receipt's items
 * came from at the line-item level (only the whole receipt has a storeId),
 * so this trends the item's price across ALL stores it appeared at, not
 * one specific store - a narrower trend would need storeId added to
 * ManifestItem itself.
 */
export function buildPriceTrend(receipts: PurchaseReceipt[], itemId: string): PriceTrendPoint[] {
  const relevant = flattenManifestItems(receipts)
    .filter(({ item }) => item.itemId === itemId)
    .sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate));

  const byMonth = new Map<string, { total: number; count: number }>();

  for (const { purchaseDate, item } of relevant) {
    const monthKey = purchaseDate.slice(0, 7); // "YYYY-MM"
    const entry = byMonth.get(monthKey) ?? { total: 0, count: 0 };
    entry.total += item.pricePerUnit;
    entry.count += 1;
    byMonth.set(monthKey, entry);
  }

  return Array.from(byMonth.entries()).map(([monthKey, { total, count }]) => ({
    monthLabel: formatMonthLabel(monthKey),
    price: Math.round((total / count) * 100) / 100,
  }));
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'short' });
}

export interface PurchaseFrequencyStats {
  itemName: string;
  totalQty3mo: number;
  totalQty6mo: number;
  totalQty12mo: number;
  avgQtyPerMonth3mo: number;
  avgQtyPerMonth6mo: number;
  avgQtyPerMonth12mo: number;
}

/**
 * "How much of this do I usually buy" assessment for the Insights tab -
 * sums purchased quantity of a given item over the trailing 3, 6, and 12
 * month windows (from `now`) and divides by the window length to get an
 * average per month. Returns null if the item hasn't appeared in any
 * receipt at all, so the UI can show an empty state instead of a
 * misleading "0/month".
 */
export function buildPurchaseFrequencyStats(
  receipts: PurchaseReceipt[],
  itemId: string,
  now: Date = new Date()
): PurchaseFrequencyStats | null {
  const cutoff3mo = new Date(now);
  cutoff3mo.setMonth(cutoff3mo.getMonth() - 3);
  const cutoff6mo = new Date(now);
  cutoff6mo.setMonth(cutoff6mo.getMonth() - 6);
  const cutoff12mo = new Date(now);
  cutoff12mo.setMonth(cutoff12mo.getMonth() - 12);

  let totalQty3mo = 0;
  let totalQty6mo = 0;
  let totalQty12mo = 0;
  let itemName: string | null = null;

  for (const { purchaseDate, item } of flattenManifestItems(receipts)) {
    if (item.itemId !== itemId) continue;
    itemName = item.itemName;

    const date = new Date(purchaseDate);
    if (date >= cutoff12mo && date <= now) totalQty12mo += item.quantity;
    if (date >= cutoff6mo && date <= now) totalQty6mo += item.quantity;
    if (date >= cutoff3mo && date <= now) totalQty3mo += item.quantity;
  }

  if (itemName === null) return null;

  return {
    itemName,
    totalQty3mo,
    totalQty6mo,
    totalQty12mo,
    avgQtyPerMonth3mo: Math.round((totalQty3mo / 3) * 10) / 10,
    avgQtyPerMonth6mo: Math.round((totalQty6mo / 6) * 10) / 10,
    avgQtyPerMonth12mo: Math.round((totalQty12mo / 12) * 10) / 10,
  };
}

/** One product that has appeared in purchase history, for the Insights tab's expandable per-product list. */
export interface PurchasedProductSummary {
  itemId: string;
  itemName: string;
}

/** Every distinct item that has ever appeared in a receipt, sorted alphabetically - feeds the expandable product list. */
export function buildPurchasedProductList(receipts: PurchaseReceipt[]): PurchasedProductSummary[] {
  const byId = new Map<string, string>();
  for (const receipt of receipts) {
    for (const item of receipt.items) {
      if (!byId.has(item.itemId)) byId.set(item.itemId, item.itemName);
    }
  }
  return Array.from(byId.entries())
    .map(([itemId, itemName]) => ({ itemId, itemName }))
    .sort((a, b) => a.itemName.localeCompare(b.itemName));
}

export interface MonthlyStoreSpendingSeries {
  storeId: string;
  storeName: string;
  color: string;
  monthlyTotals: number[]; // aligned index-for-index with MonthlyStoreSpendingData.labels
}

export interface MonthlyStoreSpendingData {
  labels: string[]; // chronological month labels
  series: MonthlyStoreSpendingSeries[];
}

// Playful, distinguishable palette for per-store lines - not the brand's
// primary mint green alone, since multiple stores need to read as clearly
// different lines on the same chart.
const STORE_LINE_COLORS = ['#2FAF7E', '#F2994A', '#C0335A', '#4A90D9', '#BB6BD9', '#F2C94C'];

/**
 * Monthly spending broken down by store, for a multi-line comparison
 * chart - each store gets its own color/series, aligned to a shared
 * chronological month axis so trends across stores are directly comparable.
 */
export function buildMonthlyStoreSpending(receipts: PurchaseReceipt[]): MonthlyStoreSpendingData {
  const monthKeys = Array.from(new Set(receipts.map((r) => r.purchaseDate.slice(0, 7)))).sort();
  const storeIds = Array.from(new Set(receipts.map((r) => r.storeId)));

  const series: MonthlyStoreSpendingSeries[] = storeIds.map((storeId, idx) => {
    const storeName = receipts.find((r) => r.storeId === storeId)?.storeName ?? 'Unknown store';
    const monthlyTotals = monthKeys.map((monthKey) =>
      receipts
        .filter((r) => r.storeId === storeId && r.purchaseDate.startsWith(monthKey))
        .reduce((sum, r) => sum + r.totalReceiptSpent, 0)
    );
    return { storeId, storeName, color: STORE_LINE_COLORS[idx % STORE_LINE_COLORS.length], monthlyTotals };
  });

  return { labels: monthKeys.map(formatMonthLabel), series };
}