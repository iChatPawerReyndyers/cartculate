// mockPurchaseHistory.ts
// TESTING ONLY - used by purchaseApi.ts's fallback when the backend is
// unreachable (see ENABLE_MOCK_FALLBACK in api/config.ts).
//
// 5 receipts spread across roughly the last 3 months (not clustered
// together) so History/Insights screens have something realistic to show
// during frontend-only testing - category spending, price trends, and
// per-product buying habits all need more than a single tight date range
// to look meaningful. storeId/itemId below match mockStoreData.ts /
// mockItemData.ts exactly (Puregold=1, S&R=2; item ids per mockItemData.ts).

import { PurchaseReceipt } from '../types';

export const mockPurchaseReceipts: PurchaseReceipt[] = [
  {
    id: '1',
    userId: '1',
    storeId: '1',
    storeName: 'Puregold',
    totalReceiptSpent: 425.0,
    purchaseDate: '2026-06-01T09:40:00',
    items: [
      { itemId: '1', itemName: 'Carrots', category: 'Vegetables', quantity: 2, pricePerUnit: 45.0 },
      { itemId: '4', itemName: 'Beef cubes', category: 'Meat', quantity: 1, pricePerUnit: 310.0 },
      { itemId: '6', itemName: 'Napkin', category: 'Toiletries', quantity: 1, pricePerUnit: 25.0 },
    ],
  },
  {
    id: '2',
    userId: '1',
    storeId: '2',
    storeName: 'S&R',
    totalReceiptSpent: 603.0,
    purchaseDate: '2026-06-21T17:15:00',
    items: [
      { itemId: '5', itemName: 'Ground pork', category: 'Meat', quantity: 2, pricePerUnit: 175.0 },
      { itemId: '7', itemName: 'Toothpaste', category: 'Toiletries', quantity: 1, pricePerUnit: 89.0 },
      { itemId: '8', itemName: 'Coca-Cola Light 1.5L', category: 'Beverages', quantity: 2, pricePerUnit: 82.0 },
    ],
  },
  {
    id: '3',
    userId: '1',
    storeId: '1',
    storeName: 'Puregold',
    totalReceiptSpent: 354.0,
    purchaseDate: '2026-07-11T10:05:00',
    items: [
      { itemId: '3', itemName: 'Potato', category: 'Vegetables', quantity: 3, pricePerUnit: 50.0 },
      { itemId: '2', itemName: 'Bell pepper', category: 'Vegetables', quantity: 2, pricePerUnit: 28.0 },
      { itemId: '9', itemName: 'Pampers Baby Wipes', category: 'Toiletries', quantity: 1, pricePerUnit: 148.0 },
    ],
  },
  {
    id: '4',
    userId: '1',
    storeId: '1',
    storeName: 'Puregold',
    totalReceiptSpent: 776.0,
    purchaseDate: '2026-08-03T18:30:00',
    items: [
      { itemId: '1', itemName: 'Carrots', category: 'Vegetables', quantity: 1, pricePerUnit: 48.0 },
      { itemId: '4', itemName: 'Beef cubes', category: 'Meat', quantity: 2, pricePerUnit: 330.0 },
      { itemId: '10', itemName: "Johnson's Cottonbuds 200s", category: 'Toiletries', quantity: 1, pricePerUnit: 68.0 },
    ],
  },
  {
    id: '5',
    userId: '1',
    storeId: '2',
    storeName: 'S&R',
    totalReceiptSpent: 422.0,
    purchaseDate: '2026-08-20T11:50:00',
    items: [
      { itemId: '6', itemName: 'Napkin', category: 'Toiletries', quantity: 2, pricePerUnit: 30.0 },
      { itemId: '11', itemName: "Johnson's Baby Powder 200g", category: 'Toiletries', quantity: 1, pricePerUnit: 92.0 },
      { itemId: '5', itemName: 'Ground pork', category: 'Meat', quantity: 1, pricePerUnit: 185.0 },
      { itemId: '8', itemName: 'Coca-Cola Light 1.5L', category: 'Beverages', quantity: 1, pricePerUnit: 85.0 },
    ],
  },
];