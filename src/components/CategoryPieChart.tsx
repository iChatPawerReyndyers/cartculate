import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { CategorySpending } from '../types';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';
import { formatCurrency } from '../utils/inputSanitization';
import NeumoDonutChart from './NeumoDonutChart';

interface CategoryPieChartProps {
  breakdown: CategorySpending[];
}

const SLICE_COLORS = ['#2FAF7E', '#F2994A', '#C0335A', '#BB6BD9', '#F2C94C'];

/** VISUAL: now renders as a NeumoDonutChart (recessed ring, embossed segments - see that file's header comment for why a flat pie doesn't read as neumorphic) instead of chart-kit's flat <PieChart>. Logic/data shaping unchanged. */
export default function CategoryPieChart({ breakdown }: CategoryPieChartProps) {
  const slices = breakdown.map((entry, idx) => ({
    key: entry.category,
    label: entry.category,
    value: entry.amountSpent,
    color: SLICE_COLORS[idx % SLICE_COLORS.length],
  }));

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>Spending by category</Text>
      <NeumoDonutChart slices={slices} formatValue={(v) => `₱${formatCurrency(v)}`} />
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
