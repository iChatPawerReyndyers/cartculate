import React, { useRef, useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent, LayoutChangeEvent, StyleSheet } from 'react-native';
import { neumo, neumoText } from '../utils/neumorphic';

interface HorizontalWheelPickerProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatLabel?: (value: number) => string;
  disabled?: boolean;
}

const TICK_WIDTH = 46;

/**
 * Horizontal swipe-to-scroll picker, snapping to fixed `step` increments.
 * Built from scratch on plain ScrollView + snapToInterval rather than a
 * new dependency - no third-party wheel-picker library was already in
 * package.json, and this is simple enough (one axis, fixed step) not to
 * need one. Center indicator line is purely visual; the source of truth
 * is which tick is nearest ScrollView's horizontal center on scroll-end.
 */
export default function HorizontalWheelPicker({
  value,
  min,
  max,
  step,
  onChange,
  formatLabel = (v) => (Number.isInteger(v) ? v.toString() : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')),
  disabled = false,
}: HorizontalWheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const steps = useMemo(() => {
    const count = Math.round((max - min) / step) + 1;
    // Round each step to avoid floating-point drift (e.g. 0.1 + 0.2 !== 0.3) breaking the value === steps[idx] check below.
    return Array.from({ length: count }, (_, i) => Math.round((min + i * step) * 10000) / 10000);
  }, [min, max, step]);

  const sidePadding = containerWidth > 0 ? containerWidth / 2 - TICK_WIDTH / 2 : 0;

  function indexForValue(v: number): number {
    const idx = Math.round((v - min) / step);
    return Math.max(0, Math.min(steps.length - 1, idx));
  }

  // Keeps the wheel visually in sync if `value` changes from outside this
  // component (e.g. a fresh fetch after another screen updated it), and
  // does the initial scroll-to-position once the container's width is
  // known (needed to compute sidePadding above).
  useEffect(() => {
    if (containerWidth === 0) return;
    scrollRef.current?.scrollTo({ x: indexForValue(value) * TICK_WIDTH, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, value, min, max, step]);

  function handleLayout(e: LayoutChangeEvent) {
    setContainerWidth(e.nativeEvent.layout.width);
  }

  function handleMomentumScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.max(0, Math.min(steps.length - 1, Math.round(e.nativeEvent.contentOffset.x / TICK_WIDTH)));
    const nextValue = steps[idx];
    if (nextValue !== value) onChange(nextValue);
  }

  return (
    <View style={styles.wrap} onLayout={handleLayout}>
      <View pointerEvents="none" style={styles.indicator} />
      {containerWidth > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: sidePadding }}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          scrollEnabled={!disabled}
        >
          {steps.map((s) => (
            <View key={s} style={styles.tick}>
              <Text style={[styles.tickText, s === value && styles.tickTextActive]}>{formatLabel(s)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 48,
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    left: '50%',
    top: 4,
    bottom: 4,
    width: 2,
    marginLeft: -1,
    backgroundColor: neumo.accent,
    opacity: 0.4,
    borderRadius: 2,
  },
  tick: {
    width: TICK_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
  },
  tickTextActive: {
    ...neumoText.heading,
    fontSize: 18,
    color: neumo.accentDark,
  },
});
