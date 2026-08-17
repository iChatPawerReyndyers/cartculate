import React from 'react';
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
}

/**
 * Items with grand total quantity === 0. They remain on the master list
 * (per spec) but are inactive for this shopping trip, so they're grouped
 * separately at the bottom instead of appearing inline in their store
 * section. Rendered with the exact same CartItem card used everywhere else.
 *
 * VISUAL: section title + divider now use the shared neumorphic tokens
 * (muted text color, soft divider line) instead of the old flat gray -
 * no structural changes, CartItem cards below already carry the
 * neumorphic card look.
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
}: CartExcludedSectionProps) {
  if (!excludedItems || excludedItems.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cart excluded</Text>
      {excludedItems.map((item) => (
        <CartItem
          key={`${item.itemId}-${item.storeId}`}
          item={item}
          mode={mode}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          onPantryAdjust={onPantryAdjust}
          onSetPantryReason={onSetPantryReason}
          onPantryTreasureFound={onPantryTreasureFound}
          onToggleChecked={onToggleChecked}
        />
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
});