import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { formatCurrency } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';

interface HomeStockSavingsCardProps {
  totalSaved: number;
}

/**
 * Feature 8's "Money Saved From Home Stock" widget. See the original doc
 * comment below for the full feature rationale - unchanged.
 *
 * VISUAL: card is now a full-width raised surface. Logic unchanged.
 */
export default function HomeStockSavingsCard({ totalSaved }: HomeStockSavingsCardProps) {
  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>🧊 Money saved from home stock</Text>
      <Text style={styles.amount}>₱{formatCurrency(totalSaved)}</Text>
      <Text style={styles.hint}>
        Based on pantry items you marked as already-have instead of buying again this trip.
      </Text>
    </NeumoRaised>
  );
}

const styles = StyleSheet.create({
  cardInner: {
    padding: 14,
    marginBottom: 10,
  },
  title: {
    ...neumoText.subheading,
    fontSize: 13,
    color: neumo.textSecondary,
    marginBottom: 6,
  },
  amount: {
    ...neumoText.heading,
    fontSize: 20,
    color: neumo.accentDark,
    marginBottom: 4,
  },
  hint: {
    ...neumoText.caption,
    fontSize: 11,
    color: neumo.textMuted,
  },
});