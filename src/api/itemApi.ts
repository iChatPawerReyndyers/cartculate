import { apiRequest, withMockFallback } from './httpClient';
import { Item } from '../types';
import { dbGetItems, dbCreateItem, dbUpdateItem } from '../data/mockDb';

interface ItemResponse {
  id: string;
  name: string;
  category: string;
  unit: string | null;
  isIngredient: boolean;
  defaultStoreId: string | null;
}

/** GET /api/items - the master item catalog, used by pickers like the New Recipe ingredient selector. */
export async function fetchItems(): Promise<Item[]> {
  return withMockFallback(() => apiRequest<ItemResponse[]>('/api/items'), () => dbGetItems());
}

/**
 * POST /api/items - adds a new product, via the Price Catalog's "+ Add
 * product" form.
 *
 * defaultStoreId is optional and three-valued:
 *  - omitted (undefined): let the backend (or, in mock mode, dbCreateItem)
 *    pre-fill it from the item's category default store, if one is
 *    configured - this is what the "Use category default" option in
 *    ProductModal sends when adding a brand-new product.
 *  - a real store id: an explicit override, always takes priority over
 *    the category default from here on.
 *  - null: explicitly "no default at all", not even the category's.
 */
export async function createItem(
  name: string,
  category: string,
  unit: string | null,
  isIngredient: boolean,
  defaultStoreId?: string | null
): Promise<Item> {
  return withMockFallback(
    () =>
      apiRequest<ItemResponse>('/api/items', {
        method: 'POST',
        body: JSON.stringify({ name, category, unit, isIngredient, defaultStoreId }),
      }),
    () => dbCreateItem(name, category, unit, isIngredient, defaultStoreId)
  );
}

/**
 * PUT /api/items/{itemId} - edits an existing product, via the Price
 * Catalog's edit modal. Unlike createItem, an edit never re-derives
 * defaultStoreId from the category default - passing undefined here
 * leaves the item's current defaultStoreId untouched, passing null clears
 * any override, and passing a store id sets an explicit override.
 */
export async function updateItem(
  itemId: string,
  name: string,
  category: string,
  unit: string | null,
  isIngredient: boolean,
  defaultStoreId?: string | null
): Promise<Item> {
  return withMockFallback(
    () =>
      apiRequest<ItemResponse>(`/api/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, category, unit, isIngredient, defaultStoreId }),
      }),
    () => dbUpdateItem(itemId, name, category, unit, isIngredient, defaultStoreId)
  );
}