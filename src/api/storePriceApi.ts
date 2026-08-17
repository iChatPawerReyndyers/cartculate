import { apiRequest, withMockFallback } from './httpClient';
import { dbGetStorePrices, dbDeletePrice, dbUpsertStorePrices } from '../data/mockDb';

export interface PriceUpdateInput {
  itemId: string;
  priceAmount: number;
}

export interface StorePriceEntry {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  priceAmount: number;
}

interface StorePriceResponse {
  itemId: string;
  itemName: string;
  storeId: string;
  storeName: string;
  priceAmount: number | string;
}

/** GET /api/store-prices - every known item price across all stores, feeds the Price Catalog view. */
export async function fetchAllStorePrices(): Promise<StorePriceEntry[]> {
  return withMockFallback(async () => {
    const prices = await apiRequest<StorePriceResponse[]>('/api/store-prices');
    return prices.map((p) => ({ ...p, priceAmount: Number(p.priceAmount) }));
  }, () => dbGetStorePrices());
}

/** DELETE /api/stores/{storeId}/prices/{itemId} - removes one item's price at this store entirely. */
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

/** PUT /api/stores/{storeId}/prices - bulk upsert, used by the receipt scanner's "Confirm" action. */
export async function updateStorePrices(
  storeId: string,
  updates: PriceUpdateInput[]
): Promise<StorePriceResponse[]> {
  return withMockFallback(
    () =>
      apiRequest<StorePriceResponse[]>(`/api/stores/${storeId}/prices`, {
        method: 'PUT',
        body: JSON.stringify({
          updates: updates.map((u) => ({ itemId: Number(u.itemId), priceAmount: u.priceAmount })),
        }),
      }),
    () => dbUpsertStorePrices(storeId, updates)
  );
}