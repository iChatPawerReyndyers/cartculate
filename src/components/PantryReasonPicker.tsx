import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { neumoText, NeumoRaised } from '../utils/neumorphic';

const QUICK_REASONS = ['📦 Freezer Find', '🥫 Pantry Stock', '🎁 Leftovers'];

// This modal's own warm cream/gold palette - kept distinct from the rest
// of the app's cool blue-gray neumorphic surfaces on purpose (see the
// original doc comment below: this is the playful "Pantry Treasure Found"
// moment, not a standard form control).
const WARM_BG = '#FFF9E6';
const WARM_BORDER = '#E8C468';
const WARM_TEXT = '#8A6B1F';

interface PantryReasonPickerProps {
  visible: boolean;
  currentReason: string | null;
  onCancel: () => void;
  onSave: (reason: string | null) => void;
  subtitle?: string;
}

/**
 * Small bottom-sheet for setting the "why is this already at home" reason
 * (Feature 2's Reason Logging). See the original doc comment below for
 * the full feature rationale - unchanged.
 *
 * VISUAL: the warm cream/gold identity is intentional and kept as-is (see
 * WARM_BG/WARM_BORDER above); chip selection now uses a raised shadow for
 * the selected chip (matching the "active = raised" convention used for
 * toggles across the app) instead of just a border/fill swap, and the
 * custom-input field is an inset well within the same warm palette. No
 * logic changed.
 */
export default function PantryReasonPicker({
  visible,
  currentReason,
  onCancel,
  onSave,
  subtitle,
}: PantryReasonPickerProps) {
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const isQuickReason = currentReason !== null && QUICK_REASONS.includes(currentReason);
    setShowCustomInput(currentReason !== null && !isQuickReason);
    setCustomText(currentReason !== null && !isQuickReason ? currentReason : '');
  }, [visible, currentReason]);

  const handleQuickSelect = (reason: string) => {
    onSave(currentReason === reason ? null : reason);
  };

  const handleSaveCustom = () => {
    const trimmed = customText.trim();
    onSave(trimmed.length > 0 ? trimmed : null);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Pantry Treasure Found! 🏴‍☠️</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          <View style={styles.chipRow}>
            {QUICK_REASONS.map((reason) => {
              const selected = currentReason === reason;
              return selected ? (
                <TouchableOpacity key={reason} onPress={() => handleQuickSelect(reason)}>
                  <NeumoRaised borderRadius={14} distance={3} style={styles.chipRaised}>
                    <Text style={styles.chipTextSelected}>{reason}</Text>
                  </NeumoRaised>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity key={reason} style={styles.chipFlat} onPress={() => handleQuickSelect(reason)}>
                  <Text style={styles.chipText}>{reason}</Text>
                </TouchableOpacity>
              );
            })}
            {showCustomInput ? (
              <TouchableOpacity onPress={() => setShowCustomInput((v) => !v)}>
                <NeumoRaised borderRadius={14} distance={3} style={styles.chipRaised}>
                  <Text style={styles.chipTextSelected}>✏️ Custom...</Text>
                </NeumoRaised>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.chipFlat} onPress={() => setShowCustomInput((v) => !v)}>
                <Text style={styles.chipText}>✏️ Custom...</Text>
              </TouchableOpacity>
            )}
          </View>

          {showCustomInput && (
            <View style={styles.customRow}>
              <View style={styles.customInputInset}>
                <TextInput
                  style={styles.customInput}
                  value={customText}
                  onChangeText={setCustomText}
                  placeholder="e.g. Bought too much last time"
                  placeholderTextColor="#C9A85A"
                  autoFocus
                />
              </View>
              <TouchableOpacity onPress={handleSaveCustom}>
                <NeumoRaised borderRadius={8} distance={3} style={styles.customSaveInner}>
                  <Text style={styles.customSaveButtonText}>Save</Text>
                </NeumoRaised>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58,67,88,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: WARM_BG,
    borderWidth: 1,
    borderColor: WARM_BORDER,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    ...neumoText.subheading,
    fontSize: 14,
    color: WARM_TEXT,
    marginBottom: 2,
  },
  subtitle: {
    ...neumoText.caption,
    fontSize: 11,
    color: WARM_TEXT,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chipFlat: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipRaised: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2FAF7E',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    ...neumoText.body,
    fontSize: 12,
    color: '#1A1A1A',
  },
  chipTextSelected: {
    ...neumoText.subheading,
    fontSize: 12,
    color: '#1F7A57',
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  customInputInset: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: WARM_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  customInput: {
    ...neumoText.body,
    fontSize: 13,
    color: '#1A1A1A',
    padding: 0,
  },
  customSaveInner: {
    backgroundColor: '#2FAF7E',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  customSaveButtonText: {
    ...neumoText.heading,
    fontSize: 13,
    color: '#FFFFFF',
  },
});