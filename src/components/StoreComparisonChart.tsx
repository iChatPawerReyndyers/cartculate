import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { StoreSpendingTotal } from '../types';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';
import { formatCurrency } from '../utils/inputSanitization';
import NeumoBarChart from './NeumoBarChart';

interface StoreComparisonChartProps {
  totals: StoreSpendingTotal[];
}

/** VISUAL: bars now render via NeumoBarChart (neumorphic "pillar" bars, react-native-svg-free) instead of chart-kit's flat <BarChart> - see NeumoBarChart.tsx. Logic/data shaping unchanged. */
export default function StoreComparisonChart({ totals }: StoreComparisonChartProps) {
  const bars = totals.map((t) => ({ key: t.storeId, label: t.storeName, value: t.totalSpent }));

  return (
    <NeumoRaised fullWidth style={styles.cardInner}>
      <Text style={styles.title}>Store spending comparison</Text>
      <NeumoBarChart data={bars} formatValue={(v) => `₱${formatCurrency(v)}`} />
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
});