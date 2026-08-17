import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PurchaseFrequencyStats } from '../utils/insightsLogic';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';

interface PurchaseFrequencyCardProps {
  stats: PurchaseFrequencyStats | null;
}

/** VISUAL: card is now a full-width raised surface, each stat block is an accent-tinted inset well instead of a flat colored box. Logic unchanged. */
export default function PurchaseFrequencyCard({ stats }: PurchaseFrequencyCardProps) {
  if (!stats) return null;

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>📊 {stats.itemName} buying habits</Text>
      <View style={styles.row}>
        <NeumoInset borderRadius={10} style={styles.statBlockInset}>
          <Text style={styles.statValue}>{stats.avgQtyPerMonth3mo}/mo</Text>
          <Text style={styles.statLabel}>Last 3 months</Text>
        </NeumoInset>
        <NeumoInset borderRadius={10} style={styles.statBlockInset}>
          <Text style={styles.statValue}>{stats.avgQtyPerMonth6mo}/mo</Text>
          <Text style={styles.statLabel}>Last 6 months</Text>
        </NeumoInset>
        <NeumoInset borderRadius={10} style={styles.statBlockInset}>
          <Text style={styles.statValue}>{stats.avgQtyPerMonth12mo}/mo</Text>
          <Text style={styles.statLabel}>Last 12 months</Text>
        </NeumoInset>
      </View>
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
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  statBlockInset: {
    flex: 1,
    backgroundColor: '#E3F7EC',
    borderColor: 'rgba(47,175,126,0.3)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    ...neumoText.heading,
    fontSize: 16,
    color: neumo.accentDark,
  },
  statLabel: {
    fontSize: 10,
    color: '#3A8A6B',
    marginTop: 2,
    textAlign: 'center',
  },
});