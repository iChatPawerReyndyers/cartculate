import React, { useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import StoreSection from '../components/StoreSection';
import CartExcludedSection from '../components/CartExcludedSection';
import { consolidateCart, calculateGrandTotal, adjustOthersQuantity } from '../utils/cartLogic';
import { CartRow } from '../types';

interface CartScreenProps {
  cartRows: CartRow[];
  setCartRows: React.Dispatch<React.SetStateAction<CartRow[]>>;
}

/**
 * cartRows/setCartRows are lifted state, shared with RecipeScreen so
 * "Add to cart" there is reflected here without a round trip to the backend.
 */
export default function CartScreen({ cartRows, setCartRows }: CartScreenProps) {
  const { stores, excludedItems } = useMemo(
    () => consolidateCart(cartRows),
    [cartRows]
  );

  const grandTotal = useMemo(() => calculateGrandTotal(stores), [stores]);

  const handleIncrement = useCallback(
    (itemId: string, storeId: string) => {
      setCartRows((rows) => adjustOthersQuantity(rows, itemId, storeId, 1));
    },
    [setCartRows]
  );

  const handleDecrement = useCallback(
    (itemId: string, storeId: string) => {
      setCartRows((rows) => adjustOthersQuantity(rows, itemId, storeId, -1));
    },
    [setCartRows]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Cartculate</Text>
        <View style={styles.totalPill}>
          <Text style={styles.totalText}>
            Total ₱{grandTotal.toFixed(2)}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {stores.map((store) => (
          <StoreSection
            key={store.storeId}
            store={store}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
          />
        ))}

        <CartExcludedSection excludedItems={excludedItems} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  totalPill: {
    backgroundColor: '#E6F1FB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0C447C',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});