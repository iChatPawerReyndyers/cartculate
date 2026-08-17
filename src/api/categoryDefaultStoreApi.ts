import { apiRequest, withMockFallback } from './httpClient';
import {
  dbGetCategoryDefaultStores,
  dbSetCategoryDefaultStore,
  dbClearCategoryDefaultStore,
} from '../data/mockDb';
import { CategoryDefaultStore } from '../types';

interface CategoryDefaultStoreResponse {
  category: string;
  storeId: string;
  storeName: string;
}

/**
 * GET /api/category-default-stores - one entry per category that
 * currently has a default store configured. A category with no default
 * simply doesn't appear in the response; the UI (CategoryDefaultStoresCard)
 * treats a missing entry as "None set".
 */
export async function fetchCategoryDefaultStores(): Promise<CategoryDefaultStore[]> {
  return withMockFallback(
    () => apiRequest<CategoryDefaultStoreResponse[]>('/api/category-default-stores'),
    () => dbGetCategoryDefaultStores()
  );
}

/**
 * PUT /api/category-default-stores/{category} - sets (or changes) a
 * category's default store. This ONLY affects NEW products created in
 * that category afterward (their Item.defaultStoreId is pre-filled from
 * this at creation time, see itemApi.ts's createItem) - it never
 * retroactively changes an existing item, and never overrides an item's
 * own explicit default store once that item has one set.
 */
export async function setCategoryDefaultStore(
  category: string,
  storeId: string
): Promise<CategoryDefaultStore> {
  return withMockFallback(
    () =>
      apiRequest<CategoryDefaultStoreResponse>(
        `/api/category-default-stores/${encodeURIComponent(category)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ storeId: Number(storeId) }),
        }
      ),
    () => dbSetCategoryDefaultStore(category, storeId)
  );
}

/** DELETE /api/category-default-stores/{category} - clears a category's default store ("None set"). */
export async function clearCategoryDefaultStore(category: string): Promise<void> {
  return withMockFallback(
    () =>
      apiRequest<void>(
        `/api/category-default-stores/${encodeURIComponent(category)}`,
        { method: 'DELETE' },
        /* expectJson */ false
      ),
    () => {
      dbClearCategoryDefaultStore(category);
      return undefined;
    }
  );
}