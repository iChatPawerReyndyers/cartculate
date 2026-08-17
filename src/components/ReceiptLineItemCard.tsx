import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ReceiptLineItem } from '../types';
import { formatCurrency } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';

interface ReceiptLineItemCardProps {
  line: ReceiptLineItem;
  onSelectMatch: (lineItemId: string, itemId: string, itemName: string) => void;
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * the card is a full-width raised surface (an orange border is kept on
 * top of that for "needs review", since color is the functional signal
 * here, not a competing visual system), and the review Picker sits in an
 * inset well instead of a bare flat background. No logic changed.
 */
export default function ReceiptLineItemCard({ line, onSelectMatch }: ReceiptLineItemCardProps) {
  return (
    <NeumoRaised
      distance={4}
      fullWidth
      style={[styles.cardInner, line.needsReview && styles.cardInnerNeedsReview]}
    >
      <View style={styles.topRow}>
        <View style={styles.nameColumn}>
          <Text style={styles.rawText}>{line.rawText}</Text>

          {line.needsReview ? (
            <NeumoInset borderRadius={8} style={styles.pickerInset}>
              <Picker
                selectedValue={line.matchedItemId}
                onValueChange={(itemId: string) => {
                  const chosen = line.alternativeMatches.find((m) => m.itemId === itemId);
                  if (chosen) onSelectMatch(line.id, chosen.itemId, chosen.itemName);
                }}
                style={styles.picker}
                mode="dropdown"
              >
                {line.alternativeMatches.map((m) => (
                  <Picker.Item key={m.itemId} label={m.itemName} value={m.itemId} />
                ))}
              </Picker>
            </NeumoInset>
          ) : (
            <Text style={styles.matchedName}>{line.matchedItemName}</Text>
          )}
        </View>

        <View style={[styles.badge, line.needsReview ? styles.badgeReview : styles.badgeMatched]}>
          <Text style={styles.badgeText}>
            {line.needsReview ? 'needs review' : 'matched'}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.qtyText}>Qty: {line.quantity}</Text>
        <Text style={styles.priceText}>₱{formatCurrency(line.pricePerUnit)}</Text>
      </View>
    </NeumoRaised>
  );
}

const styles = StyleSheet.create({
  cardInner: {
    padding: 12,
    marginBottom: 10,
  },
  cardInnerNeedsReview: {
    borderWidth: 1.5,
    borderColor: '#F2994A',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameColumn: {
    flex: 1,
    marginRight: 8,
  },
  rawText: {
    fontSize: 11,
    color: neumo.textMuted,
    textDecorationLine: 'line-through',
  },
  matchedName: {
    ...neumoText.subheading,
    fontSize: 14,
    marginTop: 2,
  },
  pickerInset: {
    marginTop: 4,
  },
  picker: {
    color: neumo.textPrimary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeMatched: {
    backgroundColor: neumo.accent,
  },
  badgeReview: {
    backgroundColor: '#F2994A',
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  qtyText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
  },
  priceText: {
    ...neumoText.heading,
    fontSize: 13,
  },
});