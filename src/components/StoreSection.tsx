import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CartItem from './CartItem';
import { StoreGroup } from '../types';

interface StoreSectionProps {
  store: StoreGroup;
  onIncrement: (itemId: string, storeId: string) => void;
  onDecrement: (itemId: string, storeId: string) => void;
}

export default function StoreSection({ store, onIncrement, onDecrement }: StoreSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{store.storeName} section</Text>
      {store.items.map((item) => (
        <CartItem
          key={`${item.itemId}-${item.storeId}`}
          item={item}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#757575',
    marginBottom: 6,
    marginTop: 12,
  },
});