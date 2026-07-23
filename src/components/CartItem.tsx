import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ConsolidatedItem } from '../types';

interface CartItemProps {
  item: ConsolidatedItem;
  onIncrement: (itemId: string, storeId: string) => void;
  onDecrement: (itemId: string, storeId: string) => void;
}

/**
 * Renders one consolidated item row. If it has more than one breakdown
 * source (e.g. sourced from 2+ recipes, or a recipe + manual "Others"),
 * it's tappable to expand an accordion showing the source breakdown.
 */
export default function CartItem({ item, onIncrement, onDecrement }: CartItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasBreakdown = item.breakdown.length > 1;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.row}
        activeOpacity={hasBreakdown ? 0.6 : 1}
        onPress={() => hasBreakdown && setExpanded((e) => !e)}
        disabled={!hasBreakdown}
      >
        <View>
          <Text style={styles.itemName}>{item.itemName}</Text>
          <Text style={styles.itemPrice}>₱{item.price.toFixed(2)} each</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => onDecrement(item.itemId, item.storeId)}
          >
            <Text style={styles.stepButtonText}>-</Text>
          </TouchableOpacity>

          <Text style={styles.quantity}>{item.totalQuantity}</Text>

          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => onIncrement(item.itemId, item.storeId)}
          >
            <Text style={styles.stepButtonText}>+</Text>
          </TouchableOpacity>

          {hasBreakdown && (
            <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
          )}
        </View>
      </TouchableOpacity>

      {hasBreakdown && expanded && (
        <View style={styles.breakdown}>
          {item.breakdown.map((b, idx) => (
            <View key={idx} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{b.label}</Text>
              <Text style={styles.breakdownQty}>{b.quantity}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  itemPrice: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  quantity: {
    fontSize: 15,
    fontWeight: '500',
    minWidth: 16,
    textAlign: 'center',
  },
  chevron: {
    fontSize: 11,
    color: '#9A9A9A',
    marginLeft: 4,
  },
  breakdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#757575',
  },
  breakdownQty: {
    fontSize: 13,
    color: '#757575',
  },
});