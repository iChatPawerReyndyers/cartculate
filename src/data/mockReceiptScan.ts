// mockReceiptScan.ts
// Placeholder response shaped like what POST /api/receipts/scan will return
// once the backend's OCR + LLM matching pipeline exists.
//
// IDs here are strings but must match the *numeric* IDs seeded by data.sql
// (see backend's src/main/resources/data.sql), since "Confirm" on this
// screen calls the real PUT /api/stores/{storeId}/prices and
// POST /api/users/{userId}/purchases endpoints - not mocked.

import { ReceiptScanResult } from '../types';

export const mockReceiptScanResult: ReceiptScanResult = {
  id: 'scan-1',
  storeId: '1', // Puregold, per data.sql
  storeName: 'Puregold',
  scannedAt: '2026-07-25T09:15:00Z',
  lineItems: [
    {
      id: 'line-1',
      rawText: 'CK LT 1.5',
      matchedItemId: '8', // Coca-Cola Light 1.5L, per data.sql
      matchedItemName: 'Coca-Cola Light 1.5L',
      category: 'Beverages',
      quantity: 2,
      pricePerUnit: 44.5,
      needsReview: false,
      alternativeMatches: [],
    },
    {
      id: 'line-2',
      rawText: 'PAMP BABY WP',
      matchedItemId: '9', // Pampers Baby Wipes, per data.sql
      matchedItemName: 'Pampers Baby Wipes',
      category: 'Toiletries',
      quantity: 1,
      pricePerUnit: 65.0,
      needsReview: false,
      alternativeMatches: [],
    },
    {
      id: 'line-3',
      rawText: 'JHNSN CTNBD 200',
      matchedItemId: '10', // Johnson's Cottonbuds 200s, per data.sql
      matchedItemName: "Johnson's Cottonbuds 200s",
      category: 'Toiletries',
      quantity: 1,
      pricePerUnit: 55.0,
      needsReview: true,
      alternativeMatches: [
        { itemId: '10', itemName: "Johnson's Cottonbuds 200s" },
        { itemId: '11', itemName: "Johnson's Baby Powder 200g" }, // per data.sql
      ],
    },
  ],
};