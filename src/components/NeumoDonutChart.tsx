// NeumoDonutChart.tsx
// Replaces react-native-chart-kit's <PieChart> for the neumorphic look
// approved in the chart preview mockup. A true flat pie doesn't read as
// "neumorphic" (there's no surface for a shadow to sit on), so this
// renders as a donut sitting in a recessed NeumoInset "well": each slice
// is a stroked circle segment (strokeDasharray trick, not a filled wedge
// path) with a muted shadow-colored duplicate drawn first to fake the
// same embossed look as NeumoLineChart's lines, and a small surface-color
// gap between segments so they read as separate raised pieces rather
// than one solid ring.
//
// Pure presentation component - CategoryPieChart.tsx builds `slices` from
// its existing CategorySpending[] data, unit/logic unchanged.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { neumo, neumoText, NeumoInset } from '../utils/neumorphic';

export interface NeumoDonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface NeumoDonutChartProps {
  slices: NeumoDonutSlice[];
  size?: number;
  formatValue?: (value: number) => string;
}

const DEFAULT_SIZE = 140;
const STROKE_WIDTH = 20;
const GAP_DEGREES = 3;

export default function NeumoDonutChart({ slices, size = DEFAULT_SIZE, formatValue }: NeumoDonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = size / 2 - STROKE_WIDTH / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  let cursorDeg = -90;
  const segments = slices.map((s) => {
    const fraction = s.value / total;
    const segmentDeg = fraction * 360;
    const drawDeg = Math.max(0, segmentDeg - GAP_DEGREES);
    const dashLength = (drawDeg / 360) * circumference;
    const rotation = cursorDeg;
    cursorDeg += segmentDeg;
    return { ...s, dashLength, rotation, fraction };
  });

  return (
    <View style={styles.wrap}>
      <NeumoInset borderRadius={size / 2} style={[styles.ring, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg) => (
            <React.Fragment key={seg.key}>
              <Circle
                cx={size / 2 + 1}
                cy={size / 2 + 1.5}
                r={radius}
                fill="none"
                stroke={neumo.shadowDark}
                strokeOpacity={0.35}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${seg.dashLength} ${circumference}`}
                strokeLinecap="round"
                rotation={seg.rotation}
                originX={size / 2 + 1}
                originY={size / 2 + 1.5}
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${seg.dashLength} ${circumference}`}
                strokeLinecap="round"
                rotation={seg.rotation}
                originX={size / 2}
                originY={size / 2}
              />
            </React.Fragment>
          ))}
        </Svg>
      </NeumoInset>
      <View style={styles.legendCol}>
        {slices.map((s) => (
          <View key={s.key} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {s.label} {Math.round((s.value / total) * 100)}%
              {formatValue ? ` · ${formatValue(s.value)}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCol: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendText: {
    ...neumoText.body,
    fontSize: 12,
    color: neumo.textSecondary,
    flexShrink: 1,
  },
});
