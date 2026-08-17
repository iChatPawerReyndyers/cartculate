import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';

interface MasterResetModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Feature 5 - Secure Master Hard-Reset Button's "Confirmation Gateway".
 * See the original doc comment below for the full feature rationale -
 * unchanged.
 *
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * "Wipe it" reuses NeumoRaised with its backgroundColor overridden to the
 * danger red (NeumoAccentRaised is hardcoded to the mint accent, so this
 * card can't use that helper directly), Cancel is an inset button. No
 * logic changed.
 */
export default function MasterResetModal({ visible, onCancel, onConfirm }: MasterResetModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Whoa there! Wiping everything? 🚨</Text>
          <Text style={styles.body}>
            This clears every cart quantity, pantry note, and recipe multiplier back to zero. This can't be undone.
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButtonWrap} onPress={onCancel}>
              <NeumoInset borderRadius={10} style={styles.cancelButtonInset}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </NeumoInset>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButtonWrap} onPress={onConfirm}>
              <NeumoRaised borderRadius={10} distance={4} fullWidth style={styles.confirmButtonInner}>
                <Text style={styles.confirmButtonText}>Wipe it</Text>
              </NeumoRaised>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58,67,88,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: neumo.background,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  title: {
    ...neumoText.heading,
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButtonWrap: {
    flex: 1,
  },
  cancelButtonInset: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...neumoText.heading,
    fontSize: 14,
  },
  confirmButtonWrap: {
    flex: 1,
  },
  confirmButtonInner: {
    backgroundColor: neumo.danger,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
});