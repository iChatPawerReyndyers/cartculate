import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConsolidatedItem, ManifestItem } from '../types';
import {
  buildExpectedManifest,
  calculateManifestTotal,
  calculateVariance,
  isCartWizardMatch,
} from '../utils/reconciliationLogic';
import { sanitizeDecimalInput, isValidPositiveNumber, formatCurrency, formatQuantityValue } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

interface ReconciliationModalProps {
  visible: boolean;
  storeName: string;
  checkedItems: ConsolidatedItem[];
  onCancel: () => void;
  onConfirm: (actualTotal: number, adjustedManifest: ManifestItem[]) => void;
  isSubmitting: boolean;
  onScanInstead?: () => void;
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * the checked-items list is one inset "well" with divided rows inside
 * (matching PriceCatalogView's list pattern), the qty-bought steppers are
 * small inset circles, the actual-total field is inset, and the wizard
 * (green)/variance (orange) callout cards are kept in their own accent
 * colors but as raised full-width surfaces instead of flat bordered
 * boxes. Confirm is a raised accent button, Cancel is inset. No logic
 * changed in this pass.
 */
export default function ReconciliationModal({
  visible,
  storeName,
  checkedItems,
  onCancel,
  onConfirm,
  isSubmitting,
  onScanInstead,
}: ReconciliationModalProps) {
  const insets = useSafeAreaInsets();
  const [actualTotalText, setActualTotalText] = useState('');
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const [boughtQtyOverrides, setBoughtQtyOverrides] = useState<Record<string, number>>({});

  const originalManifest = useMemo(() => buildExpectedManifest(checkedItems), [checkedItems]);

  useEffect(() => {
    if (!visible) {
      setActualTotalText('');
      setPriceOverrides({});
      setBoughtQtyOverrides({});
    }
  }, [visible]);

  const adjustedManifest: ManifestItem[] = useMemo(
    () =>
      originalManifest.map((item) => {
        const boughtQty = boughtQtyOverrides[item.itemId] ?? item.quantity;
        const priceOverride = priceOverrides[item.itemId];
        const parsedPrice = priceOverride !== undefined ? parseFloat(priceOverride) : NaN;
        const pricePerUnit = isNaN(parsedPrice) ? item.pricePerUnit : parsedPrice;
        return { ...item, quantity: boughtQty, pricePerUnit };
      }),
    [originalManifest, priceOverrides, boughtQtyOverrides]
  );

  const expectedTotal = useMemo(() => calculateManifestTotal(adjustedManifest), [adjustedManifest]);

  const hasValidInput = isValidPositiveNumber(actualTotalText, /* allowZero */ true);
  const actualTotal = parseFloat(actualTotalText);
  const variance = hasValidInput ? calculateVariance(actualTotal, expectedTotal) : null;
  const isCartWizard = hasValidInput && isCartWizardMatch(actualTotal, expectedTotal);
  const showPriceEditor = !isCartWizard && variance !== null && variance.hasVariance;

  const handleActualTotalChange = (text: string) => {
    setActualTotalText(sanitizeDecimalInput(text, 2));
  };

  const handlePriceOverrideChange = (itemId: string, text: string) => {
    setPriceOverrides((current) => ({ ...current, [itemId]: sanitizeDecimalInput(text, 2) }));
  };

  const handleBoughtQtyDelta = (item: ManifestItem, delta: number) => {
    setBoughtQtyOverrides((current) => {
      const currentVal = current[item.itemId] ?? item.quantity;
      const next = Math.max(0, Math.round((currentVal + delta) * 100) / 100);
      return { ...current, [item.itemId]: next };
    });
  };

  const handleConfirm = () => {
    if (!hasValidInput) return;
    onConfirm(actualTotal, adjustedManifest);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <Text style={styles.title}>Trip complete?</Text>
          <Text style={styles.subtitle}>
            {storeName} · {originalManifest.length} item{originalManifest.length === 1 ? '' : 's'} checked off
          </Text>

          <NeumoInset borderRadius={14} style={styles.itemsInset}>
            <ScrollView>
              <Text style={styles.cardLabel}>Checked items — adjust qty bought if you got less than needed</Text>
              {originalManifest.map((item, idx) => {
                const boughtQty = boughtQtyOverrides[item.itemId] ?? item.quantity;
                const unboughtQty = Math.max(0, item.quantity - boughtQty);
                const effectivePrice = showPriceEditor
                  ? parseFloat(priceOverrides[item.itemId] ?? '') || item.pricePerUnit
                  : item.pricePerUnit;

                return (
                  <View key={item.itemId} style={[styles.itemBlock, idx === 0 && styles.itemBlockFirst]}>
                    <View style={styles.itemTopRow}>
                      <Text style={styles.itemText}>
                        {item.itemName} (needed {formatQuantityValue(item.quantity)})
                      </Text>
                      {showPriceEditor ? (
                        <View style={styles.priceEditRow}>
                          <Text style={styles.pesoSignSmall}>₱</Text>
                          <View style={styles.priceEditInsetWrap}>
                            <TextInput
                              style={styles.priceEditInput}
                              value={priceOverrides[item.itemId] ?? item.pricePerUnit.toFixed(2)}
                              onChangeText={(text) => handlePriceOverrideChange(item.itemId, text)}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.itemText}>₱{formatCurrency(boughtQty * effectivePrice)}</Text>
                      )}
                    </View>

                    <View style={styles.boughtQtyRow}>
                      <Text style={styles.boughtQtyLabel}>Qty bought:</Text>
                      <TouchableOpacity onPress={() => handleBoughtQtyDelta(item, -1)}>
                        <NeumoInset borderRadius={11} style={styles.qtyStepInset}>
                          <Text style={styles.qtyStepButtonText}>-</Text>
                        </NeumoInset>
                      </TouchableOpacity>
                      <Text style={styles.boughtQtyValue}>{formatQuantityValue(boughtQty)}</Text>
                      <TouchableOpacity onPress={() => handleBoughtQtyDelta(item, 1)}>
                        <NeumoInset borderRadius={11} style={styles.qtyStepInset}>
                          <Text style={styles.qtyStepButtonText}>+</Text>
                        </NeumoInset>
                      </TouchableOpacity>
                      {unboughtQty > 0 && (
                        <Text style={styles.unboughtHint}>
                          {formatQuantityValue(unboughtQty)} stays in your cart
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
              <View style={styles.expectedTotalRow}>
                <Text style={styles.expectedTotalLabel}>Expected total</Text>
                <Text style={styles.expectedTotalLabel}>₱{formatCurrency(expectedTotal)}</Text>
              </View>
            </ScrollView>
          </NeumoInset>

          <NeumoInset borderRadius={14} style={styles.inputInset}>
            <Text style={styles.cardLabel}>Actual amount on receipt</Text>
            <View style={styles.inputRow}>
              <Text style={styles.pesoSign}>₱</Text>
              <TextInput
                style={styles.input}
                value={actualTotalText}
                onChangeText={handleActualTotalChange}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={neumo.textMuted}
              />
            </View>
          </NeumoInset>

          {isCartWizard && (
            <NeumoRaised borderRadius={14} distance={4} fullWidth style={styles.wizardCardInner}>
              <Text style={styles.wizardTitle}>🏆 Cart Wizard!</Text>
              <Text style={styles.wizardText}>
                Your estimate landed within 5% of the receipt. Nicely called.
              </Text>
            </NeumoRaised>
          )}

          {showPriceEditor && (
            <NeumoRaised borderRadius={14} distance={4} fullWidth style={styles.varianceCardInner}>
              <Text style={styles.varianceTitle}>Price variance detected</Text>
              <Text style={styles.varianceText}>
                Receipt is ₱{formatCurrency(Math.abs(variance!.amount))}{' '}
                {variance!.amount > 0 ? 'higher' : 'lower'} than expected. Adjust the item prices
                above, or scan the receipt instead for an automatic match.
              </Text>
              {onScanInstead && (
                <TouchableOpacity
                  onPress={() => {
                    onCancel();
                    onScanInstead();
                  }}
                >
                  <NeumoInset borderRadius={neumo.radiusSm} style={styles.scanInsteadInset}>
                    <Text style={styles.scanInsteadButtonText}>📷 Scan receipt instead</Text>
                  </NeumoInset>
                </TouchableOpacity>
              )}
            </NeumoRaised>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButtonWrap} onPress={onCancel} disabled={isSubmitting}>
              <NeumoInset borderRadius={10} style={styles.cancelButtonInset}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </NeumoInset>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButtonWrap}
              onPress={handleConfirm}
              disabled={!hasValidInput || isSubmitting}
            >
              <NeumoAccentRaised
                borderRadius={10}
                distance={4}
                fullWidth
                style={[styles.confirmButtonInner, (!hasValidInput || isSubmitting) && styles.confirmButtonDisabled]}
              >
                <Text style={styles.confirmButtonText}>
                  {isSubmitting ? 'Logging…' : 'Confirm & log trip'}
                </Text>
              </NeumoAccentRaised>
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
    backgroundColor: 'rgba(58,67,88,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: neumo.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  title: {
    ...neumoText.heading,
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: {
    ...neumoText.caption,
    fontSize: 12,
    marginBottom: 14,
  },
  itemsInset: {
    padding: 14,
    marginBottom: 10,
    maxHeight: 260,
  },
  cardLabel: {
    ...neumoText.subheading,
    fontSize: 12,
    color: neumo.textSecondary,
    marginBottom: 8,
  },
  itemBlock: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
  },
  itemBlockFirst: {
    borderTopWidth: 0,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    ...neumoText.body,
    fontSize: 13,
    flexShrink: 1,
  },
  priceEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pesoSignSmall: {
    fontSize: 12,
    color: neumo.textSecondary,
  },
  priceEditInsetWrap: {
    width: 58,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F2994A',
  },
  priceEditInput: {
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 3,
    color: neumo.textPrimary,
  },
  boughtQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  boughtQtyLabel: {
    ...neumoText.caption,
    fontSize: 11,
  },
  qtyStepInset: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyStepButtonText: {
    ...neumoText.heading,
    fontSize: 13,
  },
  boughtQtyValue: {
    ...neumoText.heading,
    fontSize: 13,
    minWidth: 20,
    textAlign: 'center',
  },
  unboughtHint: {
    fontSize: 10,
    color: neumo.dangerDark,
    fontStyle: 'italic',
    marginLeft: 4,
    flexShrink: 1,
  },
  expectedTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
  },
  expectedTotalLabel: {
    ...neumoText.heading,
    fontSize: 13,
  },
  inputInset: {
    padding: 14,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pesoSign: {
    fontSize: 18,
    color: neumo.textSecondary,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: neumo.textPrimary,
    paddingVertical: 4,
  },
  wizardCardInner: {
    backgroundColor: '#EAF3DE',
    padding: 12,
    marginBottom: 14,
  },
  wizardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B6D11',
    marginBottom: 2,
  },
  wizardText: {
    fontSize: 12,
    color: '#3B6D11',
  },
  varianceCardInner: {
    backgroundColor: '#FFF4E5',
    padding: 12,
    marginBottom: 14,
  },
  varianceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A5A1E',
    marginBottom: 2,
  },
  varianceText: {
    fontSize: 12,
    color: '#8A5A1E',
    marginBottom: 10,
  },
  scanInsteadInset: {
    borderWidth: 1,
    borderColor: '#F2994A',
    paddingVertical: 8,
    alignItems: 'center',
  },
  scanInsteadButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A5A1E',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
    flex: 2,
  },
  confirmButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
});