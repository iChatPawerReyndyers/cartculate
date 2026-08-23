import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { MonthlyStoreSpendingData } from '../utils/insightsLogic';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';
import NeumoLineChart from './NeumoLineChart';

interface MonthlySpendingChartProps {
  data: MonthlyStoreSpendingData;
}

/** VISUAL: line now renders via NeumoLineChart (recessed channel + embossed line, see that file's header comment) instead of chart-kit's flat <LineChart>. Logic/data shaping unchanged. */
export default function MonthlySpendingChart({ data }: MonthlySpendingChartProps) {
  if (data.series.length === 0 || data.labels.length === 0) return null;

  const series = data.series.map((s) => ({
    key: s.storeName,
    label: s.storeName,
    color: s.color,
    points: s.monthlyTotals,
  }));

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>Monthly spending by store</Text>
      <NeumoLineChart labels={data.labels} series={series} />
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
