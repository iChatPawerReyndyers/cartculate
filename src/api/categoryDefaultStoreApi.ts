import { apiRequest, withMockFallback } from './httpClient';
import {
  dbGetCategoryDefaultStores,
  dbSetCategoryDefaultStore,
  dbClearCategoryDefaultStore,
  dbSetCategoryDefaultIsIngredient,
} from '../data/mockDb';
import { CategoryDefaultStore } from '../types';

interface CategoryDefaultResponse {
  category: string;
  storeId: string | null;
  storeName: string | null;
  defaultIsIngredient: boolean;
}

/**
 * GET /api/category-defaults - one entry per category with ANY setting
 * configured (a default store, defaultIsIngredient=true, or both). A
 * category with nothing set simply doesn't appear in the response; the
 * UI (CategoryDefaultStoresCard) treats a missing entry as "None
 * set"/"off" for both.
 */
export async function fetchCategoryDefaultStores(): Promise<CategoryDefaultStore[]> {
  return withMockFallback(
    () => apiRequest<CategoryDefaultResponse[]>('/api/category-defaults'),
    () => dbGetCategoryDefaultStores()
  );
}

/**
 * PUT /api/category-defaults/store - sets (or changes) a category's
 * default store. This ONLY affects NEW products created in that category
 * afterward - it never retroactively changes an existing item.
 *
 * BUGFIX: category travels in the request body, NOT the URL path (e.g.
 * NOT /api/category-defaults/{category}/store). Categories are free text
 * and can contain "/" (e.g. "Condiments/Sauces"), and Tomcat rejects
 * encoded slashes inside a URL path segment by default - any category
 * with a slash in its name would silently 400 as a plain-old path
 * variable. Query params and bodies don't have this restriction.
 */
export async function setCategoryDefaultStore(
  category: string,
  storeId: string
): Promise<CategoryDefaultStore> {
  return withMockFallback(
    () =>
      apiRequest<CategoryDefaultResponse>('/api/category-defaults/store', {
        method: 'PUT',
        body: JSON.stringify({ category, storeId: Number(storeId) }),
      }),
    () => dbSetCategoryDefaultStore(category, storeId)
  );
}

/**
 * DELETE /api/category-defaults/store?category=... - clears a category's
 * default store ("None set"). Leaves defaultIsIngredient untouched.
 * category is a query param (encodeURIComponent-safe for slashes), not a
 * path segment - see setCategoryDefaultStore's comment above for why.
 */
export async function clearCategoryDefaultStore(category: string): Promise<void> {
  return withMockFallback(
    () =>
      apiRequest<void>(
        `/api/category-defaults/store?category=${encodeURIComponent(category)}`,
        { method: 'DELETE' },
        /* expectJson */ false
      ),
    () => {
      dbClearCategoryDefaultStore(category);
      return undefined;
    }
  );
}

/**
 * PUT /api/category-defaults/ingredient - sets whether a new product
 * created in this category starts with its "Ingredient" toggle on
 * (ProductModal.tsx). Same "creation-time convenience only" scope as the
 * store default above, and same body-not-path placement for category -
 * see setCategoryDefaultStore's comment.
 */
export async function setCategoryDefaultIsIngredient(
  category: string,
  defaultIsIngredient: boolean
): Promise<CategoryDefaultStore> {
  return withMockFallback(
    () =>
      apiRequest<CategoryDefaultResponse>('/api/category-defaults/ingredient', {
        method: 'PUT',
        body: JSON.stringify({ category, defaultIsIngredient }),
      }),
    () => dbSetCategoryDefaultIsIngredient(category, defaultIsIngredient)
  );
}
