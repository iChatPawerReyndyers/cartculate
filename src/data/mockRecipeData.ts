// mockRecipeData.ts
// TESTING ONLY - used by recipeApi.ts's fallback when the backend is
// unreachable (see ENABLE_MOCK_FALLBACK in api/config.ts).

import { Recipe } from '../types';

export const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Caldereta',
    currentMultiplier: 1,
    ingredients: [
      {
        itemId: '1',
        itemName: 'Carrots',
        category: 'Vegetables',
        baseQuantity: 2,
        unit: null,
        defaultStoreId: '1',
        defaultStoreName: 'Puregold',
        defaultPrice: 45.0,
        isCustomRouted: false,
        isOptional: false,
      },
      {
        itemId: '4',
        itemName: 'Beef cubes',
        category: 'Meat',
        baseQuantity: 500,
        unit: 'g',
        defaultStoreId: '1',
        defaultStoreName: 'Puregold',
        defaultPrice: 320.0,
        isCustomRouted: false,
        isOptional: false,
      },
      {
        itemId: '2',
        itemName: 'Bell pepper',
        category: 'Vegetables',
        baseQuantity: 1,
        unit: null,
        defaultStoreId: '1',
        defaultStoreName: 'Puregold',
        defaultPrice: 30.0,
        isCustomRouted: false,
        isOptional: false,
      },
    ],
  },
  {
    id: '2',
    name: 'Giniling',
    currentMultiplier: 1,
    ingredients: [
      {
        itemId: '5',
        itemName: 'Ground pork',
        category: 'Meat',
        baseQuantity: 250,
        unit: 'g',
        defaultStoreId: '1',
        defaultStoreName: 'Puregold',
        defaultPrice: 180.0,
        isCustomRouted: false,
        isOptional: false,
      },
      {
        itemId: '1',
        itemName: 'Carrots',
        category: 'Vegetables',
        baseQuantity: 1,
        unit: null,
        defaultStoreId: '1',
        defaultStoreName: 'Puregold',
        defaultPrice: 45.0,
        isCustomRouted: false,
        isOptional: false,
      },
      {
        itemId: '3',
        itemName: 'Potato',
        category: 'Vegetables',
        baseQuantity: 2,
        unit: null,
        defaultStoreId: '1',
        defaultStoreName: 'Puregold',
        defaultPrice: 20.0,
        isCustomRouted: false,
        isOptional: false,
      },
    ],
  },
];