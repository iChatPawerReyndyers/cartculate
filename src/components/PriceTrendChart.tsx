import React from 'react';
import { Text, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { PriceTrendPoint } from '../types';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';

interface PriceTrendChartProps {
  itemName: string;
  points: PriceTrendPoint[];
}

const screenWidth = Dimensions.get('window').width;

/** VISUAL: card is now a full-width raised surface - see MonthlySpendingChart.tsx's comment on why the chart's own rendering is unchanged. Logic unchanged. */
export default function PriceTrendChart({ itemName, points }: PriceTrendChartProps) {
  if (points.length === 0) return null;

  const chartData = {
    labels: points.map((p) => p.monthLabel),
    datasets: [{ data: points.map((p) => p.price) }],
  };

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>{itemName} price trend</Text>
      <LineChart
        data={chartData}
        width={screenWidth - 76}
        height={140}
        yAxisLabel="₱"
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: neumo.surfaceRaised,
          backgroundGradientTo: neumo.surfaceRaised,
          decimalPlaces: 2,
          color: (opacity = 1) => `rgba(47, 175, 126, ${opacity})`,
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