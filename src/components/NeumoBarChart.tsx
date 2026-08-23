// NeumoBarChart.tsx
// Replaces react-native-chart-kit's <BarChart> for screens that want the
// neumorphic "pillar" look approved in the chart preview mockup - each bar
// is its own raised Shadow-wrapped surface (same react-native-shadow-2
// dual-shadow technique as NeumoRaised in utils/neumorphic.tsx) rather than
// a flat SVG rect, because chart-kit renders its bars as one fixed SVG
// group with no per-bar style hook to attach a shadow to.
//
// Pure presentation component - callers still own their own data shaping
// (StoreComparisonChart.tsx, etc. build `bars` from their existing types).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shadow } from 'react-native-shadow-2';
import { neumo, neumoText } from '../utils/neumorphic';

export interface NeumoBarDatum {
  key: string;
  label: string;
  value: number;
}

interface NeumoBarChartProps {
  data: NeumoBarDatum[];
  /** Formats the value label above each bar, e.g. `(v) => `₱${formatCurrency(v)}``. */
  formatValue?: (value: number) => string;
  /** Pixel height of the tallest possible bar. Defaults to 120. */
  chartHeight?: number;
  barColor?: string;
}

const DEFAULT_CHART_HEIGHT = 120;
const MIN_BAR_HEIGHT = 6;

export default function NeumoBarChart({
  data,
  formatValue = (v) => v.toFixed(0),
  chartHeight = DEFAULT_CHART_HEIGHT,
  barColor = neumo.accent,
}: NeumoBarChartProps) {
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={[styles.row, { height: chartHeight + 44 }]}>
      {data.map((d) => {
        const barHeight = Math.max(MIN_BAR_HEIGHT, (d.value / maxValue) * chartHeight);
        return (
          <View key={d.key} style={styles.col}>
            <Text style={styles.valueLabel} numberOfLines={1}>
              {formatValue(d.value)}
            </Text>
            <Shadow
              distance={3}
              startColor={`${neumo.shadowDark}66`}
              offset={[2, 2]}
              style={styles.barShadowOuter}
            >
              <Shadow
                distance={3}
                startColor={`${neumo.shadowLight}CC`}
                offset={[-2, -2]}
                style={styles.barShadowOuter}
              >
                <View style={[styles.bar, { height: barHeight, backgroundColor: barColor }]}>
                  <View style={styles.barHighlight} />
                </View>
              </Shadow>
            </Shadow>
            <Text style={styles.categoryLabel} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const BAR_WIDTH = 26;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  col: {
    alignItems: 'center',
    flex: 1,
  },
  valueLabel: {
    ...neumoText.heading,
    fontSize: 10,
    color: neumo.accentDark,
    marginBottom: 6,
  },
  barShadowOuter: {
    borderRadius: 8,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
  },
  barHighlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  categoryLabel: {
    ...neumoText.caption,
    fontSize: 10,
    color: neumo.textMuted,
    marginTop: 8,
  },
});
