// mockCartData.ts
// Placeholder data shaped like the eventual API response from
// GET /api/users/{userId}/cart
// Replace with a real API call once the Spring Boot endpoint exists.

import { CartRow } from '../types';

export const mockCartRows: CartRow[] = [
  {
    id: 'row-1',
    itemId: 'item-carrots',
    itemName: 'Carrots',
    storeId: 'store-puregold',
    storeName: 'Puregold',
    price: 45.0,
    quantity: 2,
    sourceRecipeId: 'recipe-caldereta',
    sourceRecipeName: 'Caldereta',
  },
  {
    id: 'row-2',
    itemId: 'item-carrots',
    itemName: 'Carrots',
    storeId: 'store-puregold',
    storeName: 'Puregold',
    price: 45.0,
    quantity: 1,
    sourceRecipeId: 'recipe-giniling',
    sourceRecipeName: 'Giniling',
  },
  {
    id: 'row-3',
    itemId: 'item-napkin',
    itemName: 'Napkin',
    storeId: 'store-puregold',
    storeName: 'Puregold',
    price: 25.0,
    quantity: 2,
    sourceRecipeId: null,
    sourceRecipeName: null,
  },
  {
    id: 'row-4',
    itemId: 'item-napkin',
    itemName: 'Napkin',
    storeId: 'store-sr',
    storeName: 'S&R',
    price: 32.0,
    quantity: 1,
    sourceRecipeId: null,
    sourceRecipeName: null,
  },
  {
    id: 'row-5',
    itemId: 'item-toothpaste',
    itemName: 'Toothpaste',
    storeId: 'store-sr',
    storeName: 'S&R',
    price: 89.0,
    quantity: 0,
    sourceRecipeId: null,
    sourceRecipeName: null,
  },
];