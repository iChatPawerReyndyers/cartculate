// mockPurchaseHistory.ts
// TESTING ONLY - used by purchaseApi.ts's fallback when the backend is
// unreachable (see ENABLE_MOCK_FALLBACK in api/config.ts).

import { PurchaseReceipt } from '../types';

export const mockPurchaseReceipts: PurchaseReceipt[] = [
  {
    id: '1',
    userId: '1',
    storeId: '1',
    storeName: 'Puregold',
    totalReceiptSpent: 862.5,
    purchaseDate: '2026-07-05T10:00:00',
    items: [
      { itemId: '1', itemName: 'Carrots', category: 'Vegetables', quantity: 3, pricePerUnit: 45.0 },
      { itemId: '4', itemName: 'Beef cubes', category: 'Meat', quantity: 1, pricePerUnit: 320.0 },
      { itemId: '2', itemName: 'Bell pepper', category: 'Vegetables', quantity: 2, pricePerUnit: 30.0 },
    ],
  },
  {
    id: '2',
    userId: '1',
    storeId: '1',
    storeName: 'Puregold',
    totalReceiptSpent: 205.0,
    purchaseDate: '2026-07-12T10:00:00',
    items: [
      { itemId: '5', itemName: 'Ground pork', category: 'Meat', quantity: 1, pricePerUnit: 180.0 },
      { itemId: '6', itemName: 'Napkin', category: 'Toiletries', quantity: 1, pricePerUnit: 25.0 },
    ],
  },
  {
    id: '3',
    userId: '1',
    storeId: '2',
    storeName: 'S&R',
    totalReceiptSpent: 153.0,
    purchaseDate: '2026-07-15T10:00:00',
    items: [
      { itemId: '6', itemName: 'Napkin', category: 'Toiletries', quantity: 1, pricePerUnit: 32.0 },
      { itemId: '7', itemName: 'Toothpaste', category: 'Toiletries', quantity: 2, pricePerUnit: 89.0 },
    ],
  },
];