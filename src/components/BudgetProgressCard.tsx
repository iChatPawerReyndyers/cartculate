import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BudgetSummary } from '../types';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';

interface BudgetProgressCardProps {
  summary: BudgetSummary;
}

/** VISUAL: card is now a full-width raised surface, the progress track is an inset well with an accent fill bar. Logic unchanged. */
export default function BudgetProgressCard({ summary }: BudgetProgressCardProps) {
  const percentage = summary.budgetLimit === 0
    ? 0
    : Math.min(100, Math.round((summary.amountSpent / summary.budgetLimit) * 100));

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>Monthly budget</Text>
      <View style={styles.amountRow}>
        <Text style={styles.spentText}>₱{summary.amountSpent.toFixed(0)} spent</Text>
        <Text style={styles.limitText}>of ₱{summary.budgetLimit.toFixed(0)}</Text>
      </View>
      <NeumoInset borderRadius={6} style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </NeumoInset>
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
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  spentText: {
    ...neumoText.body,
    fontSize: 13,
  },
  limitText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
  },
  track: {
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: neumo.accent,
  },
});