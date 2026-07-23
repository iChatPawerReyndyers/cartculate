// mockRecipeData.ts
// Placeholder data shaped like the future GET /api/users/{userId}/recipes
// response. Replace once the Spring Boot endpoint exists.

import { Recipe } from '../types';

export const mockRecipes: Recipe[] = [
  {
    id: 'recipe-caldereta',
    name: 'Caldereta',
    ingredients: [
      {
        itemId: 'item-carrots',
        itemName: 'Carrots',
        baseQuantity: 2,
        unit: null,
        defaultStoreId: 'store-puregold',
        defaultStoreName: 'Puregold',
        defaultPrice: 45.0,
      },
      {
        itemId: 'item-beef-cubes',
        itemName: 'Beef cubes',
        baseQuantity: 500,
        unit: 'g',
        defaultStoreId: 'store-puregold',
        defaultStoreName: 'Puregold',
        defaultPrice: 320.0,
      },
      {
        itemId: 'item-bell-pepper',
        itemName: 'Bell pepper',
        baseQuantity: 1,
        unit: null,
        defaultStoreId: 'store-puregold',
        defaultStoreName: 'Puregold',
        defaultPrice: 30.0,
      },
    ],
  },
  {
    id: 'recipe-giniling',
    name: 'Giniling',
    ingredients: [
      {
        itemId: 'item-ground-pork',
        itemName: 'Ground pork',
        baseQuantity: 250,
        unit: 'g',
        defaultStoreId: 'store-puregold',
        defaultStoreName: 'Puregold',
        defaultPrice: 180.0,
      },
      {
        itemId: 'item-carrots',
        itemName: 'Carrots',
        baseQuantity: 1,
        unit: null,
        defaultStoreId: 'store-puregold',
        defaultStoreName: 'Puregold',
        defaultPrice: 45.0,
      },
      {
        itemId: 'item-potato',
        itemName: 'Potato',
        baseQuantity: 2,
        unit: null,
        defaultStoreId: 'store-puregold',
        defaultStoreName: 'Puregold',
        defaultPrice: 20.0,
      },
    ],
  },
];