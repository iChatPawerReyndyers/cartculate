import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { fetchAllStorePrices, updateStorePrices, deletePrice, StorePriceEntry } from '../api/storePriceApi';
import { fetchItems, createItem, updateItem } from '../api/itemApi';
import { fetchStores, Store } from '../api/storeApi';
import {
  fetchCategoryDefaultStores,
  setCategoryDefaultStore,
  clearCategoryDefaultStore,
} from '../api/categoryDefaultStoreApi';
import { ApiError } from '../api/httpClient';
import { formatCurrency } from '../utils/inputSanitization';
import { CategoryDefaultStore, Item } from '../types';
import { mergeCategories } from '../utils/categories';
import ProductModal, { ExistingProductPrice, ProductSaveResult } from './ProductModal';
import CategoryDefaultStoresCard from './CategoryDefaultStoresCard';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

interface GroupedItemPrice {
  itemId: string;
  itemName: string;
  prices: { storeId: string; storeName: string; priceAmount: number }[];
}

function groupByItem(entries: StorePriceEntry[]): GroupedItemPrice[] {
  const map = new Map<string, GroupedItemPrice>();
  for (const entry of entries) {
    if (!map.has(entry.itemId)) {
      map.set(entry.itemId, { itemId: entry.itemId, itemName: entry.itemName, prices: [] });
    }
    map.get(entry.itemId)!.prices.push({
      storeId: entry.storeId,
      storeName: entry.storeName,
      priceAmount: entry.priceAmount,
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
    try {
      const [priceData, itemData, storeData] = await Promise.all([
        fetchAllStorePrices(),
        fetchItems(),
        fetchStores(),
      ]);
      setEntries(priceData);
      setItems(itemData);
      setStores(storeData);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load prices.');
      setLoading(false);
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

  const grouped = useMemo(() => groupByItem(entries), [entries]);

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
        ?.prices.map((p) => ({ storeId: p.storeId, priceAmount: p.priceAmount }))
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

        const byStore = new Map<string, { itemId: string; priceAmount: number }[]>();
        for (const row of result.priceRows) {
          if (!byStore.has(row.storeId)) byStore.set(row.storeId, []);
          byStore.get(row.storeId)!.push({ itemId: itemId!, priceAmount: row.price });
        }
        await Promise.all(
          Array.from(byStore.entries()).map(([storeId, updates]) => updateStorePrices(storeId, updates))
        );

        await Promise.all(
          result.removedStoreIds.map((storeId) => deletePrice(storeId, itemId!))
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
        <NeumoRaised distance={4} fullWidth style={styles.listInner}>
          {filtered.map((group, idx) => {
            const item = items.find((i) => i.id === group.itemId);
            return (
              <TouchableOpacity
                key={group.itemId}
                style={[styles.row, idx === 0 && styles.rowFirst]}
                onPress={() => item && setEditingItem(item)}
                activeOpacity={0.6}
              >
                <Text style={styles.itemName}>{group.itemName}</Text>
                <View style={styles.rowRight}>
                  <Text style={styles.priceText} numberOfLines={1}>
                    {group.prices
                      .map((p) => `₱${formatCurrency(p.priceAmount)} ${p.storeName}`)
                      .join(' · ')}
                  </Text>
                  <Text style={styles.editIcon}>✎</Text>
                </View>
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
    gap: 12,
  },
  rowFirst: {
    borderTopWidth: 0,
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
  editIcon: {
    fontSize: 13,
    color: neumo.textMuted,
  },
  emptyText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
});