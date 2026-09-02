import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cartculate:cache:';
/** Bump this when a cached shape changes incompatibly (e.g. a field
 * renamed/removed) so old envelopes on someone's device are ignored
 * instead of getting fed into code that no longer expects them. */
const CACHE_VERSION = 1;

interface CacheEnvelope<T> {
  v: number;
  data: T;
}

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed: CacheEnvelope<T> = JSON.parse(raw);
    if (parsed.v !== CACHE_VERSION) return null;
    return parsed.data;
  } catch {
    // Corrupt/unreadable cache entry - treat exactly like "no cache yet"
    // rather than surfacing a storage error for what's purely a
    // performance optimization.
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const envelope: CacheEnvelope<T> = { v: CACHE_VERSION, data };
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(envelope));
  } catch {
    // Best-effort. A failed cache write should never block or fail the
    // real network fetch that's actually driving the screen's state.
  }
}

/**
 * Stale-while-revalidate helper for screen data loading, so switching
 * tabs or reopening a screen shows last-known data immediately instead
 * of a blank/spinner state, while a background refresh keeps it honest.
 *
 * `onCacheHit` fires first (synchronously relative to the caller's
 * await, before any network round-trip) if - and only if - something
 * was previously cached under `key`. The function then always calls
 * `fetcher`, writes its result back to the cache for next time, and
 * returns it so the caller can setState with the authoritative value.
 * Network errors propagate to the caller as normal - a cache hit is a
 * head start on rendering, never a substitute for surfacing a real
 * "failed to refresh" to the user.
 *
 * Usage (see RecipeScreen.tsx / PriceCatalogView.tsx):
 *   const fresh = await cachedFetch(CACHE_KEYS.items, fetchItems, setItems);
 *   setItems(fresh);
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  onCacheHit: (data: T) => void
): Promise<T> {
  const cached = await readCache<T>(key);
  if (cached !== null) onCacheHit(cached);
  const fresh = await fetcher();
  await writeCache(key, fresh);
  return fresh;
}

/** Central place for cache keys so screens can't accidentally collide on
 * the same key for two different shapes of data. */
export const CACHE_KEYS = {
  items: 'items',
  storePrices: 'storePrices',
  stores: 'stores',
  cart: (userId: number) => `cart:${userId}`,
  recipes: (userId: number) => `recipes:${userId}`,
} as const;