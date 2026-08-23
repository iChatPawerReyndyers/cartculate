// NeumoLineChart.tsx
// Replaces react-native-chart-kit's <LineChart> for the neumorphic look
// approved in the chart preview mockup: the plot area sits in a recessed
// "channel" (same NeumoInset treatment as text inputs elsewhere), and each
// line is drawn TWICE - a muted shadow-colored copy offset down-right,
// then the real colored line on top - to fake an embossed/emboss-out line
// since react-native-svg's <Filter>/feDropShadow support is inconsistent
// across Android/iOS. Dots get the same two-layer trick as small circles.
//
// Pure presentation component - callers still shape their own series data
// (MonthlySpendingChart.tsx, PriceTrendChart.tsx build `series` from their
// existing types).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { neumo, neumoText, NeumoInset } from '../utils/neumorphic';

export interface NeumoLineSeries {
  key: string;
  label: string;
  color: string;
  /** Y values, index-aligned with `labels`. */
  points: number[];
}

interface NeumoLineChartProps {
  labels: string[];
  series: NeumoLineSeries[];
  chartHeight?: number;
  showLegend?: boolean;
}

const DEFAULT_CHART_HEIGHT = 130;
const VIEWBOX_W = 300;
const VIEWBOX_H = 100;
const PADDING_Y = 10;

function buildPoints(values: number[], min: number, max: number): { x: number; y: number }[] {
  const span = Math.max(max - min, 1e-6);
  const step = values.length > 1 ? VIEWBOX_W / (values.length - 1) : 0;
  return values.map((v, i) => {
    const normalized = (v - min) / span;
    const y = PADDING_Y + (1 - normalized) * (VIEWBOX_H - PADDING_Y * 2);
    return { x: values.length > 1 ? i * step : VIEWBOX_W / 2, y };
  });
}

export default function NeumoLineChart({
  labels,
  series,
  chartHeight = DEFAULT_CHART_HEIGHT,
  showLegend = true,
}: NeumoLineChartProps) {
  const allValues = series.flatMap((s) => s.points);
  const min = Math.min(0, ...allValues);
  const max = Math.max(1, ...allValues);

  return (
    <View>
      <NeumoInset borderRadius={14} style={[styles.channel, { height: chartHeight }]}>
        <Svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} style={styles.svg} preserveAspectRatio="none">
          {series.map((s) => {
            const pts = buildPoints(s.points, min, max);
            const polylineStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
            return (
              <React.Fragment key={s.key}>
                {/* shadow copy - fakes an embossed line */}
                <Polyline
                  points={polylineStr}
                  fill="none"
                  stroke={neumo.shadowDark}
                  strokeOpacity={0.4}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  translateX={1}
                  translateY={1.5}
                />
                <Polyline
                  points={polylineStr}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {pts.map((p, i) => (
                  <React.Fragment key={i}>
                    <Circle cx={p.x + 1} cy={p.y + 1.5} r={4} fill={neumo.shadowDark} fillOpacity={0.35} />
                    <Circle cx={p.x} cy={p.y} r={4} fill={s.color} stroke={neumo.surfaceInset} strokeWidth={2} />
                  </React.Fragment>
                ))}
              </React.Fragment>
            );
          })}
        </Svg>
      </NeumoInset>
      <View style={styles.labelRow}>
        {labels.map((label, i) => (
          <Text key={i} style={styles.axisLabel} numberOfLines={1}>
            {label}
          </Text>
        ))}
      </View>
      {showLegend && series.length > 1 && (
        <View style={styles.legend}>
          {series.map((s) => (
            <View key={s.key} style={styles.legendPill}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText} numberOfLines={1}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  channel: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 8,
  },
  axisLabel: {
    ...neumoText.caption,
    fontSize: 10,
    color: neumo.textMuted,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  legendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: neumo.surfaceInset,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...neumoText.caption,
    fontSize: 10,
    color: neumo.textSecondary,
    fontWeight: '500',
  },
});
