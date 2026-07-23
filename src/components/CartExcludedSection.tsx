import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ConsolidatedItem } from '../types';

interface CartExcludedSectionProps {
  excludedItems: ConsolidatedItem[];
}

/**
 * Items with grand total quantity === 0. They remain on the master list
 * (per spec) but are inactive for this shopping trip, so they're grouped
 * separately at the bottom instead of appearing inline in their store section.
 */
export default function CartExcludedSection({ excludedItems }: CartExcludedSectionProps) {
  if (!excludedItems || excludedItems.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Cart excluded</Text>
      {excludedItems.map((item) => (
        <View key={`${item.itemId}-${item.storeId}`} style={styles.row}>
          <Text style={styles.itemName}>{item.itemName}</Text>
          <Text style={styles.storeLabel}>{item.storeName}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#B0B0B0',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    opacity: 0.5,
  },
  itemName: {
    fontSize: 14,
    color: '#9A9A9A',
  },
  storeLabel: {
    fontSize: 12,
    color: '#B0B0B0',
  },
});