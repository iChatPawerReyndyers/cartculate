// mockItemData.ts
// TESTING ONLY - seed data for the mock item catalog. This used to live
// directly inside itemApi.ts; it's been pulled out here so mockDb.ts can
// use it as the initial snapshot for its mutable in-memory copy (see the
// comment at the top of mockDb.ts for why a mutable copy is necessary).

import { Item } from '../types';

export const mockItems: Item[] = [
  { id: '1', name: 'Carrots', category: 'Vegetables', unit: 'kg', isIngredient: true, defaultStoreId: null },
  { id: '2', name: 'Bell pepper', category: 'Vegetables', unit: null, isIngredient: true, defaultStoreId: null },
  { id: '3', name: 'Potato', category: 'Vegetables', unit: 'kg', isIngredient: true, defaultStoreId: null },
  { id: '4', name: 'Beef cubes', category: 'Meat', unit: 'kg', isIngredient: true, defaultStoreId: null },
  { id: '5', name: 'Ground pork', category: 'Meat', unit: 'kg', isIngredient: true, defaultStoreId: null },
  { id: '6', name: 'Napkin', category: 'Toiletries', unit: 'pack', isIngredient: false, defaultStoreId: null },
  { id: '7', name: 'Toothpaste', category: 'Toiletries', unit: null, isIngredient: false, defaultStoreId: null },
  { id: '8', name: 'Coca-Cola Light 1.5L', category: 'Beverages', unit: null, isIngredient: false, defaultStoreId: null },
  { id: '9', name: 'Pampers Baby Wipes', category: 'Toiletries', unit: 'pack', isIngredient: false, defaultStoreId: null },
  { id: '10', name: "Johnson's Cottonbuds 200s", category: 'Toiletries', unit: 'pack', isIngredient: false, defaultStoreId: null },
  { id: '11', name: "Johnson's Baby Powder 200g", category: 'Toiletries', unit: null, isIngredient: false, defaultStoreId: null },
];