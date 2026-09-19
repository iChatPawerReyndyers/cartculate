import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { sanitizeDecimalInput, isValidPositiveNumber } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoAccentRaised, NeumoInset } from '../utils/neumorphic';
import { useKeyboardHeight } from '../utils/useKeyboardHeight';

interface EditPriceModalProps {
  visible: boolean;
  itemName: string;
  storeName: string;
  currentPrice: number;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (price: number) => Promise<void>;
}

export default function EditPriceModal({
  visible,
  itemName,
  storeName,
  currentPrice,
  isSaving,
  onCancel,
  onSave,
}: EditPriceModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  // See useKeyboardHeight.ts - computed by hand since KeyboardAvoidingView
  // doesn't reliably track the keyboard from inside a <Modal>. Centered
  // dialog, so the fix is the same idea as the bottom sheets: lift clear
  // of the keyboard and cap the height so it can't be pushed off-screen.
  const sheetMarginBottom = keyboardHeight;
  const sheetMaxHeight = keyboardHeight > 0 ? windowHeight - keyboardHeight - 48 : undefined;
  const [priceText, setPriceText] = useState('');

  useEffect(() => {
    if (visible) setPriceText(currentPrice.toFixed(2));
  }, [visible, currentPrice]);

  const handleSave = async () => {
    if (!isValidPositiveNumber(priceText, true)) {
      Alert.alert('Check price', 'Enter a valid price of 0 or more.');
      return;
    }
    await onSave(parseFloat(priceText));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { marginBottom: sheetMarginBottom, maxHeight: sheetMaxHeight }]}>
            <Text style={styles.title}>Edit price</Text>
            <Text style={styles.subtitle}>{itemName} at {storeName}</Text>
            <NeumoInset borderRadius={neumo.radiusSm} style={styles.inputInset}>
              <Text style={styles.currency}>₱</Text>
              <TextInput
                style={styles.input}
                value={priceText}
                onChangeText={(text) => setPriceText(sanitizeDecimalInput(text, 2))}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
              />
            </NeumoInset>
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={onCancel} disabled={isSaving} style={styles.cancelWrap}>
                <NeumoInset borderRadius={neumo.radiusSm} style={styles.cancelInner}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </NeumoInset>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} disabled={isSaving} style={styles.saveWrap}>
                <NeumoAccentRaised borderRadius={neumo.radiusSm} distance={3} fullWidth style={styles.saveInner}>
                  <Text style={styles.saveText}>{isSaving ? 'Saving...' : 'Save price'}</Text>
                </NeumoAccentRaised>
              </TouchableOpacity>
            </View>
          </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(58,67,88,0.35)' },
  sheet: { width: '100%', maxWidth: 360, padding: 18, borderRadius: 16, backgroundColor: neumo.background },
  title: { ...neumoText.heading, fontSize: 18, marginBottom: 4 },
  subtitle: { ...neumoText.caption, fontSize: 12, marginBottom: 14 },
  inputInset: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 16 },
  currency: { ...neumoText.heading, fontSize: 16, color: neumo.accentDark },
  input: { flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 16, color: neumo.textPrimary },
  buttonRow: { flexDirection: 'row', gap: 10 },
  cancelWrap: { flex: 1 },
  cancelInner: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { ...neumoText.body, fontSize: 13 },
  saveWrap: { flex: 1 },
  saveInner: { alignItems: 'center', paddingVertical: 10, backgroundColor: neumo.accent },
  saveText: { ...neumoText.heading, fontSize: 13, color: '#FFFFFF' },
});
