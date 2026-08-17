import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { neumo, neumoText, NeumoInset } from '../utils/neumorphic';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  sheetTitle?: string;
}

/**
 * Cross-platform dropdown replacement for @react-native-picker/picker's
 * <Picker> - see the original doc comment below for why this exists.
 *
 * VISUAL: the tappable field is now an inset "well" (matching every other
 * text-input-like control across the app), and the selection sheet uses
 * the shared neumorphic background/typography. No logic changed.
 *
 * WHY THIS EXISTS: Picker's `mode="dropdown"` prop is Android-only - on
 * iOS, Picker always renders as an inline scrolling wheel showing every
 * option stacked vertically, never as a collapsed single-line dropdown.
 * This renders as a single tappable field showing the current selection,
 * which opens a compact modal list on tap - consistent behavior on both
 * platforms, and safe to use inline/repeated without runaway height.
 */
export default function SelectField({ value, options, onChange, placeholder = 'Select...', sheetTitle }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}>
        <NeumoInset borderRadius={neumo.radiusSm} style={styles.fieldInset}>
          <Text style={styles.fieldText} numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </NeumoInset>
      </TouchableOpacity>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {sheetTitle && <Text style={styles.sheetTitle}>{sheetTitle}</Text>}
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.optionRow}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, opt.value === value && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldInset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldText: {
    ...neumoText.body,
    fontSize: 14,
    flex: 1,
    marginRight: 6,
  },
  chevron: {
    fontSize: 11,
    color: neumo.textMuted,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58,67,88,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: neumo.background,
    borderRadius: 18,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
  },
  sheetTitle: {
    ...neumoText.heading,
    fontSize: 15,
    marginBottom: 10,
  },
  optionRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
  },
  optionText: {
    ...neumoText.body,
    fontSize: 14,
  },
  optionTextSelected: {
    ...neumoText.heading,
    fontSize: 14,
    color: neumo.accent,
  },
});