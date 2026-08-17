import { apiRequest, withMockFallback } from './httpClient';
import { dbGetStores, dbCreateStore } from '../data/mockDb';

export interface Store {
  id: string;
  name: string;
}

/** GET /api/stores - all stores, used by pickers. */
export async function fetchStores(): Promise<Store[]> {
  return withMockFallback(() => apiRequest<Store[]>('/api/stores'), () => dbGetStores());
}

/**
 * POST /api/stores - creates a new store. Used by ProductModal's (and the
 * Cart tab's new-product form's) "+ Add new store" option, for when the
 * store someone wants to price something at hasn't been saved yet.
 */
export async function createStore(name: string): Promise<Store> {
  return withMockFallback(
    () =>
      apiRequest<Store>('/api/stores', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    () => dbCreateStore(name)
  );
}
