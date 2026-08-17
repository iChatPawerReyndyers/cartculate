import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { MonthlyStoreSpendingData } from '../utils/insightsLogic';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';

interface MonthlySpendingChartProps {
  data: MonthlyStoreSpendingData;
}

const screenWidth = Dimensions.get('window').width;

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * VISUAL: card is now a full-width raised surface with a transparent
 * chart background so it reads as sitting directly on the card instead
 * of a separate white panel. The chart itself is rendered by
 * react-native-chart-kit as SVG - its internal line/grid styling isn't
 * something the neumorphic shadow system can wrap, so only the
 * surrounding card and typography changed. Logic unchanged.
 */
export default function MonthlySpendingChart({ data }: MonthlySpendingChartProps) {
  if (data.series.length === 0 || data.labels.length === 0) return null;

  const chartData = {
    labels: data.labels,
    datasets: data.series.map((s) => ({
      data: s.monthlyTotals,
      color: (opacity = 1) => hexToRgba(s.color, opacity),
      strokeWidth: 2,
    })),
    legend: data.series.map((s) => s.storeName),
  };

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>Monthly spending by store</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 76}
        height={180}
        yAxisLabel="₱"
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: neumo.surfaceRaised,
          backgroundGradientTo: neumo.surfaceRaised,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
          propsForDots: { r: '3' },
        }}
        bezier
        style={styles.chart}
      />
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
  chart: {
    borderRadius: 8,
    marginLeft: -16,
  },
});