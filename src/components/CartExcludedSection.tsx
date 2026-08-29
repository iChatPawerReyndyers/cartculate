import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CartItem from './CartItem';
import { ConsolidatedItem, UserMode } from '../types';
import { neumo, neumoText } from '../utils/neumorphic';

interface CartExcludedSectionProps {
  excludedItems: ConsolidatedItem[];
  mode: UserMode;
  onIncrement: (itemId: string, storeId: string) => void;
  onDecrement: (itemId: string, storeId: string) => void;
  onPantryAdjust: (rowId: string, delta: number) => void;
  onSetPantryReason: (rowId: string, reason: string | null) => void;
  onPantryTreasureFound: (rowId: string, reason: string) => void;
  onToggleChecked: (rowId: string, checked: boolean) => void;
  onRequestMove: (item: ConsolidatedItem) => void;
}

/**
 * Items with grand total quantity === 0. They remain on the master list
 * (per spec) but are inactive for this shopping trip, so they're grouped
 * separately at the bottom instead of appearing inline in their store
 * section. Rendered with the exact same CartItem card used everywhere else.
 *
 * Grouped by category within this section too now (mirrors
 * CategorySection.tsx's exact grouping/sort/render pattern) - previously
 * excluded items were just one flat list regardless of category, unlike
 * every other view in the Cart tab which already groups by category or
 * store.
 */
export default function CartExcludedSection({
  excludedItems,
  mode,
  onIncrement,
  onDecrement,
  onPantryAdjust,
  onSetPantryReason,
  onPantryTreasureFound,
  onToggleChecked,
  onRequestMove,
}: CartExcludedSectionProps) {
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, ConsolidatedItem[]>();
    for (const item of excludedItems) {
      const key = item.category || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries())
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.itemName.localeCompare(b.itemName)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [excludedItems]);

  if (!excludedItems || excludedItems.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cart excluded</Text>
      {groupedByCategory.map((group) => (
        <View key={group.category} style={styles.categoryGroup}>
          <Text style={styles.categoryTitle}>{group.category}</Text>
          {group.items.map((item) => (
            <CartItem
              key={`${item.itemId}-${item.storeId}`}
              item={item}
              mode={mode}
              showStoreName
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onPantryAdjust={onPantryAdjust}
              onSetPantryReason={onSetPantryReason}
              onPantryTreasureFound={onPantryTreasureFound}
              onToggleChecked={onToggleChecked}
              onRequestMove={onRequestMove}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.35)',
  },
  sectionTitle: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
    marginBottom: 10,
  },
  categoryGroup: {
    marginBottom: 8,
  },
  categoryTitle: {
    ...neumoText.heading,
    fontSize: 12,
    color: neumo.textMuted,
    marginBottom: 6,
  },
});