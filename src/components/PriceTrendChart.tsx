import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { PriceTrendPoint } from '../types';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';
import NeumoLineChart from './NeumoLineChart';

interface PriceTrendChartProps {
  itemName: string;
  points: PriceTrendPoint[];
}

/** VISUAL: line now renders via NeumoLineChart (recessed channel + embossed line, see that file's header comment) instead of chart-kit's flat <LineChart>. Single series, so its own legend is suppressed (showLegend=false) same as before. Logic/data shaping unchanged. */
export default function PriceTrendChart({ itemName, points }: PriceTrendChartProps) {
  if (points.length === 0) return null;

  const series = [
    {
      key: itemName,
      label: itemName,
      color: neumo.accent,
      points: points.map((p) => p.price),
    },
  ];

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>{itemName} price trend</Text>
      <NeumoLineChart labels={points.map((p) => p.monthLabel)} series={series} showLegend={false} />
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
