// receiptLogic.ts
// Pure functions for Feature 4 (AI-Powered Receipt Scanner). The actual OCR
// + LLM matching happens server-side (POST /api/receipts/scan); these
// functions only handle client-side review-state edits and turning a
// confirmed scan into the writes the backend needs to persist.

import { ReceiptScanResult, ManifestItem } from '../types';

/**
 * Applies a manual correction when the user picks a different match from
 * the "needs review" dropdown. Clears the needsReview flag once corrected.
 */
export function applyManualMatch(
  scanResult: ReceiptScanResult,
  lineItemId: string,
  chosenItemId: string,
  chosenItemName: string
): ReceiptScanResult {
  return {
    ...scanResult,
    lineItems: scanResult.lineItems.map((line) =>
      line.id === lineItemId
        ? {
            ...line,
            matchedItemId: chosenItemId,
            matchedItemName: chosenItemName,
            needsReview: false,
          }
        : line
    ),
  };
}

/** True only once every line item has been matched (no "needs review" left). */
export function isReadyToConfirm(scanResult: ReceiptScanResult): boolean {
  return scanResult.lineItems.every((line) => !line.needsReview);
}

/**
 * Converts a confirmed scan into the Store_Price upsert payload:
 * one { itemId, storeId, priceAmount } per line item, ready for
 * PUT /api/stores/{storeId}/prices.
 */
export function buildStorePriceUpdates(
  scanResult: ReceiptScanResult
): { itemId: string; storeId: string; priceAmount: number }[] {
  return scanResult.lineItems.map((line) => ({
    itemId: line.matchedItemId,
    storeId: scanResult.storeId,
    priceAmount: line.pricePerUnit,
  }));
}

/** The shape POST /api/users/{userId}/purchases now expects: one receipt, with a structured item list. */
export interface ReceiptPurchasePayload {
  storeId: string;
  totalReceiptSpent: number;
  purchaseDate: string;
  items: ManifestItem[];
}

/**
 * Converts a confirmed scan into ONE receipt-level purchase payload, ready
 * for POST /api/users/{userId}/purchases. Purchase_History is now
 * receipt-level (a JSON manifest, not one row per item), so this returns a
 * single object instead of an array - totalReceiptSpent is computed as the
 * sum of every line item's (quantity * pricePerUnit).
 *
 * purchaseDateOverride: the date the user picked on the "when was this
 * receipt?" field (see ReceiptScannerScreen) - the AI scan itself never
 * reads a date off the receipt, so this always reflects what the person
 * actually confirmed, not just "the moment they happened to tap Scan".
 * Falls back to scanResult.scannedAt (the scan timestamp) only if no
 * override is passed, so existing callers/tests keep working unchanged.
 */
export function buildPurchaseHistoryFromReceipt(
  scanResult: ReceiptScanResult,
  purchaseDateOverride?: string
): ReceiptPurchasePayload {
  const items: ManifestItem[] = scanResult.lineItems.map((line) => ({
    itemId: line.matchedItemId,
    itemName: line.matchedItemName,
    category: line.category,
    quantity: line.quantity,
    pricePerUnit: line.pricePerUnit,
  }));

  const totalReceiptSpent = items.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0);

  return {
    storeId: scanResult.storeId,
    totalReceiptSpent,
    purchaseDate: purchaseDateOverride ?? scanResult.scannedAt,
    items,
  };
}