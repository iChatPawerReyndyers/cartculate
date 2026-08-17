import React from 'react';
import { Text, Dimensions, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { CategorySpending } from '../types';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';

interface CategoryPieChartProps {
  breakdown: CategorySpending[];
}

const screenWidth = Dimensions.get('window').width;

const SLICE_COLORS = ['#2FAF7E', '#F2994A', '#C0335A', '#BB6BD9', '#F2C94C'];

/** VISUAL: card is now a full-width raised surface - see MonthlySpendingChart.tsx's comment on why the chart's own rendering is unchanged. Logic unchanged. */
export default function CategoryPieChart({ breakdown }: CategoryPieChartProps) {
  const chartData = breakdown.map((entry, idx) => ({
    name: `${entry.category} ${entry.percentage}%`,
    population: entry.amountSpent,
    color: SLICE_COLORS[idx % SLICE_COLORS.length],
    legendFontColor: neumo.textSecondary,
    legendFontSize: 12,
  }));

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>Spending by category</Text>
      <PieChart
        data={chartData}
        width={screenWidth - 76}
        height={140}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="8"
        hasLegend
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
});