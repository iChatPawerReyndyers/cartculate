import { apiRequest, withMockFallback } from './httpClient';
import { PurchaseReceipt, ManifestItem } from '../types';
import { ReceiptPurchasePayload } from '../utils/receiptLogic';
import { dbGetPurchases, dbCreatePurchase } from '../data/mockDb';

interface PurchaseReceiptResponse {
  id: string;
  userId: string;
  storeId: string;
  storeName: string;
  totalReceiptSpent: number | string;
  purchaseDate: string;
  itemManifestJson: string;
}

function parseManifest(itemManifestJson: string): ManifestItem[] {
  try {
    const parsed = JSON.parse(itemManifestJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // malformed manifest shouldn't crash the whole Insights screen
  }
}

/** GET /api/users/{userId}/purchases - receipt-level history, feeds every Insights chart. */
export async function fetchPurchases(userId: number): Promise<PurchaseReceipt[]> {
  return withMockFallback(async () => {
    const receipts = await apiRequest<PurchaseReceiptResponse[]>(`/api/users/${userId}/purchases`);
    return receipts.map((r) => ({
      id: r.id,
      userId: r.userId,
      storeId: r.storeId,
      storeName: r.storeName,
      totalReceiptSpent: Number(r.totalReceiptSpent),
      purchaseDate: r.purchaseDate,
      items: parseManifest(r.itemManifestJson),
    }));
  }, () => dbGetPurchases());
}

/** POST /api/users/{userId}/purchases - archives ONE receipt at Checkout completion. */
export async function createPurchase(
  userId: number,
  payload: ReceiptPurchasePayload
): Promise<PurchaseReceipt> {
  return withMockFallback(
    async () => {
      const r = await apiRequest<PurchaseReceiptResponse>(`/api/users/${userId}/purchases`, {
        method: 'POST',
        body: JSON.stringify({
          storeId: Number(payload.storeId),
          totalReceiptSpent: payload.totalReceiptSpent,
          purchaseDate: payload.purchaseDate,
          items: payload.items.map((item) => ({
            itemId: Number(item.itemId),
            itemName: item.itemName,
            category: item.category,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
          })),
        }),
      });
      return {
        id: r.id,
        userId: r.userId,
        storeId: r.storeId,
        storeName: r.storeName,
        totalReceiptSpent: Number(r.totalReceiptSpent),
        purchaseDate: r.purchaseDate,
        items: parseManifest(r.itemManifestJson),
      };
    },
    () => dbCreatePurchase(payload.storeId, payload.totalReceiptSpent, payload.purchaseDate, payload.items)
  );
}