import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';
import HorizontalWheelPicker from './HorizontalWheelPicker';

interface MultiplierControlProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  isUpdating?: boolean;
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? v.toString() : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Three ways to change the multiplier, from coarsest to finest intent:
 *  - tap +/- to nudge by `step`
 *  - tap the number itself to type an exact value (not snapped to `step` -
 *    typing implies wanting precision, e.g. ×1.5 for half a batch extra)
 *  - swipe the strip below for fast scrubbing (HorizontalWheelPicker)
 * The buttons and typed input don't depend on any drag gesture, so they
 * keep working even if the swipe strip's gesture is ever flaky again.
 */
export default function MultiplierControl({
  value,
  min,
  max,
  step,
  onChange,
  isUpdating = false,
}: MultiplierControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(formatValue(value));

  function startEditing() {
    if (isUpdating) return;
    setDraftText(formatValue(value));
    setIsEditing(true);
  }

  function commitEdit() {
    setIsEditing(false);
    const parsed = parseFloat(draftText.replace(',', '.'));
    if (Number.isNaN(parsed)) return;
    const next = Math.round(clamp(parsed, min, max) * 100) / 100;
    if (next !== value) onChange(next);
  }

  function nudge(direction: 1 | -1) {
    if (isUpdating) return;
    const next = Math.round(clamp(value + direction * step, min, max) * 10000) / 10000;
    if (next !== value) onChange(next);
  }

  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => nudge(-1)}
          disabled={isUpdating || atMin}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <NeumoRaised
            borderRadius={20}
            distance={3}
            style={StyleSheet.flatten([styles.stepperButton, (isUpdating || atMin) && styles.stepperButtonDisabled])}
          >
            <Text style={[styles.stepperText, (isUpdating || atMin) && styles.stepperTextDisabled]}>−</Text>
          </NeumoRaised>
        </TouchableOpacity>

        {isUpdating ? (
          <ActivityIndicator size="small" color={neumo.accent} style={styles.valueSpinner} />
        ) : isEditing ? (
          <View style={styles.valueEditRow}>
            <Text style={styles.valuePrefix}>×</Text>
            <TextInput
              style={styles.valueInput}
              value={draftText}
              onChangeText={setDraftText}
              onBlur={commitEdit}
              onSubmitEditing={commitEdit}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
            />
          </View>
        ) : (
          <TouchableOpacity onPress={startEditing} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.valueText}>×{formatValue(value)}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => nudge(1)}
          disabled={isUpdating || atMax}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <NeumoRaised
            borderRadius={20}
            distance={3}
            style={StyleSheet.flatten([styles.stepperButton, (isUpdating || atMax) && styles.stepperButtonDisabled])}
          >
            <Text style={[styles.stepperText, (isUpdating || atMax) && styles.stepperTextDisabled]}>+</Text>
          </NeumoRaised>
        </TouchableOpacity>
      </View>

      {!isUpdating && (
        <View style={styles.wheelWrap}>
          <HorizontalWheelPicker value={value} min={min} max={max} step={step} onChange={onChange} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  stepperButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperText: {
    ...neumoText.heading,
    fontSize: 20,
    color: neumo.accentDark,
  },
  stepperTextDisabled: {
    color: neumo.textMuted,
  },
  valueText: {
    ...neumoText.heading,
    fontSize: 22,
    color: neumo.accentDark,
    minWidth: 70,
    textAlign: 'center',
  },
  valueEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 70,
    justifyContent: 'center',
  },
  valuePrefix: {
    ...neumoText.heading,
    fontSize: 22,
    color: neumo.accentDark,
  },
  valueInput: {
    ...neumoText.heading,
    fontSize: 22,
    color: neumo.accentDark,
    minWidth: 44,
    textAlign: 'center',
    padding: 0,
  },
  valueSpinner: {
    minWidth: 70,
  },
  wheelWrap: {
    marginTop: 10,
  },
});