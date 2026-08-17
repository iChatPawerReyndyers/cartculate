import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CartItem from './CartItem';
import { StoreGroup, UserMode } from '../types';
import { calculateGrandTotal } from '../utils/cartLogic';
import { formatCurrency } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';

interface StoreSectionProps {
  store: StoreGroup;
  itemMode: UserMode;
  showGroceryButton: boolean;
  isStarted: boolean;
  checkedCount: number;
  onToggleStart: () => void;
  onIncrement: (itemId: string, storeId: string) => void;
  onDecrement: (itemId: string, storeId: string) => void;
  onPantryAdjust: (rowId: string, delta: number) => void;
  onSetPantryReason: (rowId: string, reason: string | null) => void;
  onPantryTreasureFound: (rowId: string, reason: string) => void;
  onToggleChecked: (rowId: string, checked: boolean) => void;
}

/**
 * VISUAL: now built on the neumorphic primitives in utils/neumorphic.tsx -
 * the "Start Grocery"/"Done Checkout" pill is a raised accent button when
 * inactive and an inset "pressed" pill once a trip is started, matching
 * the reference library's active/pressed button pair. No logic changed.
 */
export default function StoreSection({
  store,
  itemMode,
  showGroceryButton,
  isStarted,
  checkedCount,
  onToggleStart,
  onIncrement,
  onDecrement,
  onPantryAdjust,
  onSetPantryReason,
  onPantryTreasureFound,
  onToggleChecked,
}: StoreSectionProps) {
  const displayItems = useMemo(() => {
    if (!isStarted) return store.items;
    return [...store.items].sort((a, b) => Number(a.isCheckedCheckout) - Number(b.isCheckedCheckout));
  }, [store.items, isStarted]);

  const estimatedCost = useMemo(() => calculateGrandTotal(store.items), [store.items]);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.storeName}>{store.storeName}</Text>
        <Text style={styles.estimatedCost}>₱{formatCurrency(estimatedCost)}</Text>
      </View>

      {showGroceryButton && (
        <View style={styles.groceryButtonRow}>
          <TouchableOpacity onPress={onToggleStart} disabled={isStarted && checkedCount === 0}>
            {isStarted ? (
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.groceryButtonInset}>
                <Text style={styles.groceryButtonTextActive}>
                  {`Done Checkout${checkedCount > 0 ? ` (${checkedCount})` : ''}`}
                </Text>
              </NeumoInset>
            ) : (
              <View style={styles.groceryButtonAccent}>
                <Text style={styles.groceryButtonText}>Start Grocery</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {displayItems.map((item) => (
        <CartItem
          key={`${item.itemId}-${item.storeId}`}
          item={item}
          mode={itemMode}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 6,
  },
  storeName: {
    ...neumoText.heading,
    fontSize: 14,
  },
  estimatedCost: {
    ...neumoText.heading,
    fontSize: 13,
    color: neumo.accentDark,
  },
  groceryButtonRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  // Inactive state: raised accent pill (same treatment as CartItem's "+").
  groceryButtonAccent: {
    backgroundColor: neumo.accent,
    borderRadius: neumo.radiusSm,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  groceryButtonText: {
    ...neumoText.heading,
    fontSize: 11,
    color: '#FFFFFF',
  },
  // Active state ("trip in progress"): inset pill, reading as "pressed in".
  groceryButtonInset: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  groceryButtonTextActive: {
    ...neumoText.heading,
    fontSize: 11,
    color: neumo.textPrimary,
  },
});