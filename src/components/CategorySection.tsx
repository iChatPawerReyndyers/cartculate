import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CartItem from './CartItem';
import { ConsolidatedItem, UserMode } from '../types';
import { neumoText } from '../utils/neumorphic';

interface CategorySectionProps {
  category: string;
  items: ConsolidatedItem[];
  mode: UserMode;
  onIncrement: (itemId: string, storeId: string) => void;
  onDecrement: (itemId: string, storeId: string) => void;
  onPantryAdjust: (rowId: string, delta: number) => void;
  onSetPantryReason: (rowId: string, reason: string | null) => void;
  onPantryTreasureFound: (rowId: string, reason: string) => void;
  onToggleChecked: (rowId: string, checked: boolean) => void;
}

/** VISUAL: category title now uses the shared neumorphic text tokens (font family/weight only) - no structural changes, CartItem cards below already carry the neumorphic card look. */
export default function CategorySection({
  category,
  items,
  mode,
  onIncrement,
  onDecrement,
  onPantryAdjust,
  onSetPantryReason,
  onPantryTreasureFound,
  onToggleChecked,
}: CategorySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.categoryTitle}>{category}</Text>
      {items.map((item) => (
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
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  categoryTitle: {
    ...neumoText.heading,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 6,
  },
});