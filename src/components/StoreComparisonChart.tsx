import React from 'react';
import { Text, Dimensions, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { StoreSpendingTotal } from '../types';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';

interface StoreComparisonChartProps {
  totals: StoreSpendingTotal[];
}

const screenWidth = Dimensions.get('window').width;

/** VISUAL: card is now a full-width raised surface with a transparent chart background - see MonthlySpendingChart.tsx's comment on why the chart's own rendering is unchanged. Logic unchanged. */
export default function StoreComparisonChart({ totals }: StoreComparisonChartProps) {
  const chartData = {
    labels: totals.map((t) => t.storeName),
    datasets: [{ data: totals.map((t) => t.totalSpent) }],
  };

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>Store spending comparison</Text>
      <BarChart
        data={chartData}
        width={screenWidth - 76}
        height={160}
        yAxisLabel="₱"
        yAxisSuffix=""
        fromZero
        showValuesOnTopOfBars
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: neumo.surfaceRaised,
          backgroundGradientTo: neumo.surfaceRaised,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(47, 175, 126, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(117, 117, 117, ${opacity})`,
          barPercentage: 0.6,
        }}
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