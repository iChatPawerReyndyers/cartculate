import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import {
  fetchAllStorePrices,
  updateStorePrices,
  clearPersonalStorePrice,
  deletePrice,
  StorePriceEntry,
} from '../api/storePriceApi';
import { fetchItems, createItem, updateItem, updateItemIncludeInCart, deleteItem } from '../api/itemApi';
import { fetchStores, Store } from '../api/storeApi';
import {
  fetchCategoryDefaultStores,
  setCategoryDefaultStore,
  clearCategoryDefaultStore,
  setCategoryDefaultIsIngredient,
} from '../api/categoryDefaultStoreApi';
import { ApiError } from '../api/httpClient';
import { formatCurrency } from '../utils/inputSanitization';
import { CategoryDefaultStore, Item } from '../types';
import { mergeCategories } from '../utils/categories';
import { cachedFetch, CACHE_KEYS } from '../utils/cache';
import ProductModal, { ExistingProductPrice, ProductSaveResult } from './ProductModal';
import CategoryDefaultStoresCard from './CategoryDefaultStoresCard';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

interface GroupedItemPrice {
  itemId: string;
  itemName: string;
  prices: { storeId: string; storeName: string; priceAmount: number; priceSource: 'SCAN' | 'MANUAL'; isPersonalOverride: boolean }[];
}

function groupByItem(items: Item[], entries: StorePriceEntry[]): GroupedItemPrice[] {
  const map = new Map<string, GroupedItemPrice>();
  // Seed from the full item catalog first, not just from priced entries -
  // otherwise a product with no price set yet (or one whose only price
  // was just deleted) never appears here at all, and there'd be no way
  // to delete it from this screen.
  for (const item of items) {
    map.set(item.id, { itemId: item.id, itemName: item.name, prices: [] });
  }
  for (const entry of entries) {
    if (!map.has(entry.itemId)) {
      map.set(entry.itemId, { itemId: entry.itemId, itemName: entry.itemName, prices: [] });
    }
    map.get(entry.itemId)!.prices.push({
      storeId: entry.storeId,
      storeName: entry.storeName,
      priceAmount: entry.priceAmount,
      priceSource: entry.priceSource,
      isPersonalOverride: entry.isPersonalOverride,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.itemName.localeCompare(b.itemName));
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * the search bar is inset, "+ Add product" is a raised accent pill, and
 * the item list is a single full-width inset "well" with divided rows
 * inside (matching the reference library's list pattern), rather than
 * flat white rows with hairline borders. No logic changed in this pass.
 */
export default function PriceCatalogView() {
  const [entries, setEntries] = useState<StorePriceEntry[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categoryDefaultStores, setCategoryDefaultStores] = useState<CategoryDefaultStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    let usedCache = false;
    try {
      const [priceData, itemData, storeData] = await Promise.all([
        cachedFetch(CACHE_KEYS.storePrices, fetchAllStorePrices, (cached) => {
          // Cached items+prices are enough to render the catalog list -
          // drop the spinner right away instead of waiting on the
          // network, the same pattern as RecipeScreen's loadAll.
          usedCache = true;
          setEntries(cached);
          setLoading(false);
        }),
        cachedFetch(CACHE_KEYS.items, fetchItems, (cached) => {
          usedCache = true;
          setItems(cached);
          setLoading(false);
        }),
        cachedFetch(CACHE_KEYS.stores, fetchStores, setStores),
      ]);
      setEntries(priceData);
      setItems(itemData);
      setStores(storeData);
      setLoadError(null);
    } catch (err) {
      // Don't hide already-visible cached data behind an error screen -
      // only a true first-load (nothing cached yet) blocks on this.
      if (!usedCache) {
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load prices.');
        setLoading(false);
      }
      return;
    }

    try {
      const categoryDefaultData = await fetchCategoryDefaultStores();
      setCategoryDefaultStores(categoryDefaultData);
    } catch (err) {
      setCategoryDefaultStores([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const grouped = useMemo(() => groupByItem(items, entries), [items, entries]);

  const categories = useMemo(() => {
    const fromItems = mergeCategories(items.map((i) => i.category));
    const extra = categoryDefaultStores
      .map((c) => c.category)
      .filter((c) => !fromItems.includes(c));
    const withoutOthers = fromItems.filter((c) => c !== 'Others');
    return [...withoutOthers, ...extra.sort((a, b) => a.localeCompare(b)), 'Others'];
  }, [items, categoryDefaultStores]);

  const filtered = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return grouped;
    return grouped.filter((g) => g.itemName.toLowerCase().includes(query));
  }, [grouped, searchText]);

  const editingPrices: ExistingProductPrice[] | undefined = editingItem
    ? grouped
        .find((g) => g.itemId === editingItem.id)
        ?.prices.map((p) => ({ storeId: p.storeId, priceAmount: p.priceAmount, isPersonalOverride: p.isPersonalOverride }))
    : undefined;

  const handleCategoryDefaultChange = useCallback(async (category: string, storeId: string | null) => {
    try {
      if (storeId === null) {
        await clearCategoryDefaultStore(category);
        setCategoryDefaultStores((current) => current.filter((c) => c.category !== category));
      } else {
        const updated = await setCategoryDefaultStore(category, storeId);
        setCategoryDefaultStores((current) => [
          ...current.filter((c) => c.category !== category),
          updated,
        ]);
      }
    } catch (err) {
      Alert.alert('Could not update default store', 'Please check your connection and try again.');
    }
  }, []);

  const handleCategoryIngredientDefaultChange = useCallback(async (category: string, defaultIsIngredient: boolean) => {
    // Optimistic update, matching handleCategoryDefaultChange's pattern - the toggle should
    // flip instantly, not wait on a round trip, since it's a low-stakes preference.
    setCategoryDefaultStores((current) => {
      const existing = current.find((c) => c.category === category);
      if (existing) {
        return current.map((c) => (c.category === category ? { ...c, defaultIsIngredient } : c));
      }
      return [...current, { category, storeId: null, storeName: null, defaultIsIngredient }];
    });
    try {
      await setCategoryDefaultIsIngredient(category, defaultIsIngredient);
    } catch (err) {
      setCategoryDefaultStores((current) =>
        current.map((c) => (c.category === category ? { ...c, defaultIsIngredient: !defaultIsIngredient } : c))
      );
      Alert.alert('Could not update default', 'Please check your connection and try again.');
    }
  }, []);

  /**
   * Feature: per-item checkbox controlling Cart tab visibility. Optimistic
   * update (flips local state immediately, rolls back on failure) to match
   * the pattern used everywhere else in this app (handleModeChange in
   * CartScreen.tsx, handleIncrement/handleDecrement in App.tsx, etc.).
   */
  const handleToggleIncludeInCart = useCallback(async (item: Item) => {
    const nextValue = !item.includeInCart;
    setItems((current) => current.map((i) => (i.id === item.id ? { ...i, includeInCart: nextValue } : i)));
    try {
      await updateItemIncludeInCart(item.id, nextValue);
    } catch (err) {
      setItems((current) => current.map((i) => (i.id === item.id ? { ...i, includeInCart: !nextValue } : i)));
      Alert.alert('Could not update item', 'Please check your connection and try again.');
    }
  }, []);

  /**
   * Deletion cascades wherever this item is referenced (prices at every
   * store, any cart it's in, any recipe using it - see ItemService's
   * deleteItem on the backend), so this confirms first rather than doing
   * the usual optimistic-then-rollback pattern used elsewhere in this
   * file - a destructive action this wide shouldn't fire on a single
   * accidental tap.
   */
  const handleDeleteItem = useCallback((item: Item) => {
    Alert.alert(
      `Delete ${item.name}?`,
      "This removes it everywhere - its prices at every store, any recipe that uses it, and anyone's cart. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(item.id);
              setItems((current) => current.filter((i) => i.id !== item.id));
              setEntries((current) => current.filter((e) => e.itemId !== item.id));
            } catch (err) {
              Alert.alert('Could not delete item', 'Please check your connection and try again.');
            }
          },
        },
      ]
    );
  }, []);

  const handleSaveProduct = useCallback(
    async (result: ProductSaveResult) => {
      try {
        let itemId = result.itemId;
        if (itemId) {
          await updateItem(itemId, result.name, result.category, result.unit, result.isIngredient, result.defaultStoreId);
        } else {
          const created = await createItem(result.name, result.category, result.unit, result.isIngredient, result.defaultStoreId);
          itemId = created.id;
        }

        // No more "This is different for me" toggle - every price row is
        // always the shared/baseline price, batched per-store same as
        // before. clearedPersonalStoreIds (from ProductModal) still needs
        // applying: it clears any legacy personal override left over from
        // before this feature was removed (or from the receipt scanner's
        // separate personal-price flow), so the shared price just saved
        // above actually takes effect instead of being shadowed by a
        // stale override - see ProductModal.tsx's ExistingProductPrice
        // doc comment.
        const byStore = new Map<string, { itemId: string; priceAmount: number }[]>();
        for (const row of result.priceRows) {
          if (!byStore.has(row.storeId)) byStore.set(row.storeId, []);
          byStore.get(row.storeId)!.push({ itemId: itemId!, priceAmount: row.price });
        }

        await Promise.all(
          Array.from(byStore.entries()).map(([storeId, updates]) => updateStorePrices(storeId, updates, 'MANUAL'))
        );

        await Promise.all(result.removedStoreIds.map((storeId) => deletePrice(storeId, itemId!)));
        await Promise.all(
          result.clearedPersonalStoreIds.map((storeId) => clearPersonalStorePrice(storeId, itemId!))
        );

        setEditingItem(null);
        setShowAddModal(false);
        await loadCatalog();
      } catch (err) {
        Alert.alert('Could not save product', 'Please check your connection and try again.');
      }
    },
    [loadCatalog]
  );

  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={neumo.accent} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity onPress={loadCatalog}>
          <NeumoAccentRaised borderRadius={neumo.radiusSm} distance={4} style={styles.retryButtonInner}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </NeumoAccentRaised>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CategoryDefaultStoresCard
        categories={categories}
        stores={stores}
        categoryDefaultStores={categoryDefaultStores}
        onChange={handleCategoryDefaultChange}
        onIngredientDefaultChange={handleCategoryIngredientDefaultChange}
      />

      <View style={styles.headerRow}>
        <NeumoInset borderRadius={neumo.radiusSm} style={styles.searchInsetWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search items..."
            placeholderTextColor={neumo.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </NeumoInset>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <NeumoAccentRaised borderRadius={neumo.radiusSm} distance={3} style={styles.addButtonInner}>
            <Text style={styles.addButtonText}>+ Add product</Text>
          </NeumoAccentRaised>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.listContent}>
        <NeumoRaised fullWidth style={styles.listInner}>
          {filtered.map((group, idx) => {
            const item = items.find((i) => i.id === group.itemId);
            return (
              <View key={group.itemId} style={[styles.row, idx === 0 && styles.rowFirst]}>
                {item && (
                  <TouchableOpacity
                    style={styles.leadingCheckboxWrap}
                    onPress={() => handleToggleIncludeInCart(item)}
                    activeOpacity={0.7}
                  >
                    {item.includeInCart ? (
                      <NeumoAccentRaised borderRadius={6} distance={3} style={styles.checkboxChecked}>
                        <Text style={styles.checkmark}>✓</Text>
                      </NeumoAccentRaised>
                    ) : (
                      <NeumoInset borderRadius={6} style={styles.checkboxInset} />
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={() => item && setEditingItem(item)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.itemName}>{group.itemName}</Text>
                  <View style={styles.rowRight}>
                    <Text style={styles.priceText} numberOfLines={1}>
                      {group.prices.map((p, i) => (
                        <Text key={`${p.storeId}-${i}`}>
                          {i > 0 ? ' · ' : ''}
                          {`₱${formatCurrency(p.priceAmount)} ${p.storeName}`}
                          {p.isPersonalOverride ? <Text style={styles.mineTag}> · mine</Text> : null}
                        </Text>
                      ))}
                    </Text>
                  </View>
                </TouchableOpacity>
                {item && (
                  <TouchableOpacity
                    style={styles.deleteButtonWrap}
                    onPress={() => handleDeleteItem(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.deleteIcon}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
          {filtered.length === 0 && (
            <Text style={styles.emptyText}>No items match "{searchText}".</Text>
          )}
        </NeumoRaised>
      </ScrollView>

      <ProductModal
        visible={showAddModal}
        mode="add"
        stores={stores}
        categories={categories}
        categoryDefaultStores={categoryDefaultStores}
        onCancel={() => setShowAddModal(false)}
        onSave={handleSaveProduct}
      />

      <ProductModal
        visible={editingItem !== null}
        mode="edit"
        stores={stores}
        categories={categories}
        categoryDefaultStores={categoryDefaultStores}
        existingItemId={editingItem?.id}
        existingName={editingItem?.name}
        existingCategory={editingItem?.category}
        existingUnit={editingItem?.unit}
        existingIsIngredient={editingItem?.isIngredient}
        existingDefaultStoreId={editingItem?.defaultStoreId}
        existingPrices={editingPrices}
        onCancel={() => setEditingItem(null)}
        onSave={handleSaveProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButtonInner: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  searchInsetWrap: {
    flex: 1,
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: neumo.textPrimary,
  },
  addButtonInner: {
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  addButtonText: {
    ...neumoText.heading,
    fontSize: 12,
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  scrollView: {
    flex: 1,
  },
  listInner: {
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
    gap: 12,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  leadingCheckboxWrap: {
    // no extra margin - `row`'s gap already spaces this from rowMain
  },
  checkboxInset: {
    width: 20,
    height: 20,
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  itemName: {
    ...neumoText.body,
    fontSize: 14,
    flexShrink: 1,
  },
  priceText: {
    ...neumoText.caption,
    fontSize: 12,
    flexShrink: 1,
    textAlign: 'right',
  },
  mineTag: {
    fontSize: 10,
    fontWeight: '700',
    color: neumo.accentDark,
  },
  deleteButtonWrap: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  deleteIcon: {
    fontSize: 15,
  },
  emptyText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
});