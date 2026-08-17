// mockStoreData.ts
// TESTING ONLY - seed data for the mock store list. Pulled out of
// storeApi.tsx so mockDb.ts can use it as the initial snapshot for its
// mutable in-memory copy (see mockDb.ts for details).

import type { Store } from '../api/storeApi';

export const mockStores: Store[] = [
  { id: '1', name: 'Puregold' },
  { id: '2', name: 'S&R' },
];