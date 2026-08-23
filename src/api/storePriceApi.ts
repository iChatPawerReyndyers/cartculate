import { apiRequest, withMockFallback } from './httpClient';
import { CURRENT_USER_ID } from './config';
import {
  dbGetResolvedStorePricesForUser,
  dbDeletePrice,
  dbUpsertStorePrices,
  dbUpsertPersonalStorePrices,
  dbClearPersonalPrice,
} from '../data/mockDb';

export interface PriceUpdateInput {
  itemId: string;
  priceAmount: number;
}

export type PriceSource = 'SCAN' | 'MANUAL';

export interface StorePriceEntry {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  priceAmount: number;
  /** Where this price's current value came from - see the checkbox/tagging feature. Defaults 'MANUAL' if a backend response omits it (older rows predating this field). */
  priceSource: PriceSource;
  /**
   * Feature: personal price overrides. True if this price is CURRENT_USER_ID's
   * own override (e.g. a different price from their suki) rather than
   * the shared baseline everyone else sees. See ProductModal.tsx's
   * "This is different for me" toggle and StorePriceService.java
   * (backend) for the full resolution logic.
   */
  isPersonalOverride: boolean;
}

interface StorePriceResponse {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  priceAmount: number | string;
  priceSource?: PriceSource;
  isPersonalOverride?: boolean;
}

function mapResponse(p: StorePriceResponse): StorePriceEntry {
  return {
    ...p,
    priceAmount: Number(p.priceAmount),
    priceSource: p.priceSource ?? 'MANUAL',
    isPersonalOverride: p.isPersonalOverride ?? false,
  };
}

/**
 * GET /api/users/{userId}/store-prices - every price CURRENT_USER_ID
 * should see: the shared baseline, except wherever they have their own
 * personal override, which wins instead. Feeds the Price Catalog view.
 * (Was GET /api/store-prices - the old unscoped endpoint still exists on
 * the backend for anything that genuinely wants the raw shared baseline,
 * but the app itself now always wants the resolved-for-this-user view.)
 */
export async function fetchAllStorePrices(): Promise<StorePriceEntry[]> {
  return withMockFallback(async () => {
    const prices = await apiRequest<StorePriceResponse[]>(`/api/users/${CURRENT_USER_ID}/store-prices`);
    return prices.map(mapResponse);
  }, () => dbGetResolvedStorePricesForUser());
}

/** DELETE /api/stores/{storeId}/prices/{itemId} - removes one item's SHARED price at this store entirely. Does not touch anyone's personal override. */
export async function deletePrice(storeId: string, itemId: string): Promise<void> {
  return withMockFallback(
    () =>
      apiRequest<void>(
        `/api/stores/${storeId}/prices/${itemId}`,
        { method: 'DELETE' },
        /* expectJson */ false
      ),
    () => dbDeletePrice(storeId, itemId)
  );
}

/**
 * PUT /api/stores/{storeId}/prices - bulk upsert the SHARED/baseline
 * price, used by manual per-store price entry in the Pricing tab when
 * NOT marked "different for me". `source` distinguishes scan vs manual,
 * per the price-tagging feature.
 */
export async function updateStorePrices(
  storeId: string,
  updates: PriceUpdateInput[],
  source: PriceSource
): Promise<StorePriceResponse[]> {
  return withMockFallback(
    () =>
      apiRequest<StorePriceResponse[]>(`/api/stores/${storeId}/prices`, {
        method: 'PUT',
        body: JSON.stringify({
          updates: updates.map((u) => ({ itemId: Number(u.itemId), priceAmount: u.priceAmount, source })),
        }),
      }),
    () => dbUpsertStorePrices(storeId, updates, source)
  );
}

/**
 * PUT /api/users/{userId}/stores/{storeId}/prices/personal - bulk upsert
 * CURRENT_USER_ID's own PERSONAL price overrides at a store. Used by the
 * receipt scanner's "Confirm" action (a scanned receipt is inherently
 * this user's own purchase, not necessarily "the" universal price - see
 * ReceiptScannerScreen.tsx), and by the "This is different for me"
 * toggle in ProductModal.tsx.
 */
export async function updatePersonalStorePrices(
  storeId: string,
  updates: PriceUpdateInput[],
  source: PriceSource
): Promise<StorePriceEntry[]> {
  return withMockFallback(
    async () => {
      const prices = await apiRequest<StorePriceResponse[]>(
        `/api/users/${CURRENT_USER_ID}/stores/${storeId}/prices/personal`,
        {
          method: 'PUT',
          body: JSON.stringify({
            updates: updates.map((u) => ({ itemId: Number(u.itemId), priceAmount: u.priceAmount, source })),
          }),
        }
      );
      return prices.map(mapResponse);
    },
    () => dbUpsertPersonalStorePrices(storeId, updates, source)
  );
}

/** DELETE /api/users/{userId}/stores/{storeId}/prices/{itemId}/personal - clears CURRENT_USER_ID's personal override, reverting them to the shared baseline (if any). */
export async function clearPersonalStorePrice(storeId: string, itemId: string): Promise<void> {
  return withMockFallback(
    () =>
      apiRequest<void>(
        `/api/users/${CURRENT_USER_ID}/stores/${storeId}/prices/${itemId}/personal`,
        { method: 'DELETE' },
        /* expectJson */ false
      ),
    () => {
      dbClearPersonalPrice(storeId, itemId);
      return undefined;
    }
  );
}
