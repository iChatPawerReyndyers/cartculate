// mockStorePriceData.ts
// TESTING ONLY - seed data for the mock Store_Price catalog. Pulled out of
// storePriceApi.ts so mockDb.ts can use it as the initial snapshot for its
// mutable in-memory copy (see mockDb.ts for details).

import type { StorePriceEntry } from '../api/storePriceApi';

export const mockAllPrices: StorePriceEntry[] = [
  { itemId: '1', itemName: 'Carrots', storeId: '1', storeName: 'Puregold', priceAmount: 45.0 },
  { itemId: '2', itemName: 'Bell pepper', storeId: '1', storeName: 'Puregold', priceAmount: 30.0 },
  { itemId: '3', itemName: 'Potato', storeId: '1', storeName: 'Puregold', priceAmount: 20.0 },
  { itemId: '4', itemName: 'Beef cubes', storeId: '1', storeName: 'Puregold', priceAmount: 320.0 },
  { itemId: '5', itemName: 'Ground pork', storeId: '1', storeName: 'Puregold', priceAmount: 180.0 },
  { itemId: '6', itemName: 'Napkin', storeId: '1', storeName: 'Puregold', priceAmount: 25.0 },
  { itemId: '6', itemName: 'Napkin', storeId: '2', storeName: 'S&R', priceAmount: 32.0 },
  { itemId: '7', itemName: 'Toothpaste', storeId: '2', storeName: 'S&R', priceAmount: 89.0 },
  { itemId: '8', itemName: 'Coca-Cola Light 1.5L', storeId: '1', storeName: 'Puregold', priceAmount: 44.5 },
  { itemId: '9', itemName: 'Pampers Baby Wipes', storeId: '1', storeName: 'Puregold', priceAmount: 65.0 },
  { itemId: '10', itemName: "Johnson's Cottonbuds 200s", storeId: '1', storeName: 'Puregold', priceAmount: 55.0 },
  { itemId: '11', itemName: "Johnson's Baby Powder 200g", storeId: '1', storeName: 'Puregold', priceAmount: 58.0 },
];