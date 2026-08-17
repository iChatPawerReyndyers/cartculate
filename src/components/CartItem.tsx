import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ConsolidatedItem, UserMode } from '../types';
import { formatCurrency, formatQuantityValue, formatQuantityWithUnit } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';
import PantryReasonPicker from './PantryReasonPicker';

interface CartItemProps {
  item: ConsolidatedItem;
  mode: UserMode;
  onIncrement: (itemId: string, storeId: string) => void;
  onDecrement: (itemId: string, storeId: string) => void;
  onPantryAdjust: (rowId: string, delta: number) => void;
  onSetPantryReason: (rowId: string, reason: string | null) => void;
  onPantryTreasureFound: (rowId: string, reason: string) => void;
  onToggleChecked: (rowId: string, checked: boolean) => void;
  showStoreName?: boolean;
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx.
 * BUGFIX: outer card now passes `fullWidth` to NeumoRaised - without it,
 * the Shadow-based card sized itself to its content instead of stretching
 * to fill the row, leaving a visible gap on the right edge (see
 * neumorphic.tsx's file header for why Shadow needs this explicitly).
 * No other changes in this pass.
 */
export default function CartItem({
  item,
  mode,
  onIncrement,
  onDecrement,
  onPantryAdjust,
  onSetPantryReason,
  onPantryTreasureFound,
  onToggleChecked,
  showStoreName = false,
}: CartItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [reasonPickerRowId, setReasonPickerRowId] = useState<string | null>(null);
  const [reasonPickerCurrentReason, setReasonPickerCurrentReason] = useState<string | null>(null);
  const [interceptedRowId, setInterceptedRowId] = useState<string | null>(null);

  const hasBreakdown = item.breakdown.length > 1;
  const needToBuy = Math.max(0, item.totalQuantity - item.totalPantryQty);
  const hasPantryDeduction = mode === 'HOME' && item.totalPantryQty > 0;
  const canExpand = hasBreakdown || hasPantryDeduction;

  const recipeRequiredQty = item.breakdown
    .filter((b) => b.sourceRecipeId !== null)
    .reduce((sum, b) => sum + b.quantity, 0);

  const primaryReason = item.breakdown.find((b) => b.rowId === item.primaryRowId)?.overrideReason ?? null;

  const openReasonPicker = (rowId: string, currentReason: string | null) => {
    setReasonPickerRowId(rowId);
    setReasonPickerCurrentReason(currentReason);
  };

  const handleMainDecrement = () => {
    if (mode === 'HOME') {
      const wouldBeQuantity = item.totalQuantity - 1;
      if (recipeRequiredQty > 0 && wouldBeQuantity < recipeRequiredQty) {
        const targetRowId =
          item.primaryRowId ?? item.breakdown.find((b) => b.sourceRecipeId !== null)?.rowId ?? null;
        if (targetRowId) {
          const targetRow = item.breakdown.find((b) => b.rowId === targetRowId);
          setInterceptedRowId(targetRowId);
          openReasonPicker(targetRowId, targetRow?.overrideReason ?? null);
          return;
        }
      }
    }
    onDecrement(item.itemId, item.storeId);
  };

  const handleReasonSave = (reason: string | null) => {
    if (reasonPickerRowId) {
      if (interceptedRowId === reasonPickerRowId) {
        if (reason) onPantryTreasureFound(reasonPickerRowId, reason);
      } else {
        onSetPantryReason(reasonPickerRowId, reason);
      }
    }
    setReasonPickerRowId(null);
    setInterceptedRowId(null);
  };

  const handleToggleItemChecked = () => {
    if (!item.primaryRowId) return;
    const nextChecked = !item.isCheckedCheckout;
    if (hasBreakdown) {
      item.breakdown.forEach((b) => onToggleChecked(b.rowId, nextChecked));
    } else {
      onToggleChecked(item.primaryRowId, nextChecked);
    }
  };

  return (
    <NeumoRaised style={styles.cardInner} distance={5} fullWidth>
      <View style={styles.row}>
        {mode === 'AWAY' && item.primaryRowId && (
          <TouchableOpacity
            style={styles.leadingCheckboxWrap}
            onPress={handleToggleItemChecked}
            activeOpacity={0.7}
          >
            {item.isCheckedCheckout ? (
              <View style={styles.checkboxChecked}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            ) : (
              <NeumoInset borderRadius={6} style={styles.checkboxInset} />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.nameSection}
          activeOpacity={canExpand ? 0.6 : 1}
          onPress={() => canExpand && setExpanded((e) => !e)}
          disabled={!canExpand}
        >
          <View style={styles.nameRow}>
            <Text style={styles.itemName}>
              {item.unit ? `${item.itemName} (${item.unit})` : item.itemName}
            </Text>
            {canExpand && <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>}
          </View>
          {mode === 'HOME' && item.totalPantryQty > 0 ? (
            <Text style={styles.itemPrice}>
              {showStoreName ? `${item.storeName} · ` : ''}Total needed: {formatQuantityValue(item.totalQuantity)} · Have: {formatQuantityValue(item.totalPantryQty)}
            </Text>
          ) : (
            <Text style={styles.itemPrice}>
              {showStoreName ? `${item.storeName} · ` : ''}₱{formatCurrency(item.price)} each
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.controls}>
          <TouchableOpacity onPress={handleMainDecrement} activeOpacity={0.75}>
            <NeumoInset borderRadius={neumo.radiusSm} style={styles.stepButtonInset}>
              <Text style={styles.stepButtonMinusText}>-</Text>
            </NeumoInset>
          </TouchableOpacity>

          <Text style={styles.quantity}>{formatQuantityValue(needToBuy)}</Text>

          <TouchableOpacity onPress={() => onIncrement(item.itemId, item.storeId)} activeOpacity={0.85}>
            <NeumoAccentRaised borderRadius={neumo.radiusSm} distance={3} style={styles.stepButtonAccent}>
              <Text style={styles.stepButtonPlusText}>+</Text>
            </NeumoAccentRaised>
          </TouchableOpacity>
        </View>
      </View>

      {canExpand && expanded && (
        <View style={styles.breakdown}>
          {item.breakdown.map((b) => (
            <View key={b.rowId} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{b.label}</Text>
              <Text style={styles.breakdownQty}>{formatQuantityWithUnit(b.quantity, item.unit)}</Text>
            </View>
          ))}
          {hasPantryDeduction && (
            <View style={styles.breakdownRow}>
              <Text style={styles.pantryDeductionLabel}>{primaryReason ?? 'Pantry override'}</Text>
              <Text style={styles.pantryDeductionQty}>
                -{formatQuantityWithUnit(item.totalPantryQty, item.unit)}
              </Text>
            </View>
          )}
        </View>
      )}

      {mode === 'HOME' && item.primaryRowId && (
        <View style={styles.pantryRow}>
          <Text style={styles.pantryLabel}>🧊 Already have:</Text>
          <TouchableOpacity onPress={() => onPantryAdjust(item.primaryRowId!, -1)} activeOpacity={0.75}>
            <NeumoInset borderRadius={11} style={styles.pantryStepInset}>
              <Text style={styles.pantryStepButtonText}>-</Text>
            </NeumoInset>
          </TouchableOpacity>
          <Text style={styles.pantryQty}>{formatQuantityValue(item.totalPantryQty)}</Text>
          <TouchableOpacity onPress={() => onPantryAdjust(item.primaryRowId!, 1)} activeOpacity={0.75}>
            <NeumoInset borderRadius={11} style={styles.pantryStepInset}>
              <Text style={styles.pantryStepButtonText}>+</Text>
            </NeumoInset>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openReasonPicker(item.primaryRowId!, primaryReason)}
            style={styles.reasonButtonWrap}
          >
            <NeumoInset borderRadius={12} style={styles.reasonButtonInset}>
              <Text style={styles.reasonButtonText}>{primaryReason ?? 'Set reason'}</Text>
            </NeumoInset>
          </TouchableOpacity>
        </View>
      )}

      <PantryReasonPicker
        visible={reasonPickerRowId !== null}
        currentReason={reasonPickerCurrentReason}
        onCancel={() => {
          setReasonPickerRowId(null);
          setInterceptedRowId(null);
        }}
        onSave={handleReasonSave}
        subtitle={
          interceptedRowId
            ? `Buying less ${item.itemName} than your recipes need. Already have some at home?`
            : undefined
        }
      />
    </NeumoRaised>
  );
}

const styles = StyleSheet.create({
  cardInner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leadingCheckboxWrap: {
    marginRight: 10,
  },
  checkboxInset: {
    width: 20,
    height: 20,
  },
  nameSection: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    ...neumoText.subheading,
    fontSize: 15,
  },
  chevron: {
    fontSize: 10,
    color: neumo.textMuted,
  },
  itemPrice: {
    ...neumoText.caption,
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepButtonInset: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonMinusText: {
    ...neumoText.heading,
    fontSize: 16,
  },
  stepButtonAccent: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonPlusText: {
    ...neumoText.heading,
    fontSize: 16,
    color: '#FFFFFF',
  },
  quantity: {
    ...neumoText.heading,
    fontSize: 15,
    minWidth: 16,
    textAlign: 'center',
  },
  breakdown: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.35)',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  breakdownLabel: {
    ...neumoText.subheading,
    fontSize: 13,
    color: neumo.textSecondary,
  },
  breakdownQty: {
    ...neumoText.caption,
    fontSize: 13,
  },
  pantryDeductionLabel: {
    ...neumoText.subheading,
    fontSize: 13,
    color: neumo.dangerDark,
  },
  pantryDeductionQty: {
    ...neumoText.subheading,
    fontSize: 13,
    color: neumo.dangerDark,
  },
  pantryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.35)',
    borderStyle: 'dashed',
    flexWrap: 'wrap',
  },
  pantryLabel: {
    ...neumoText.caption,
    fontSize: 12,
  },
  pantryStepInset: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pantryStepButtonText: {
    ...neumoText.heading,
    fontSize: 12,
  },
  pantryQty: {
    ...neumoText.heading,
    fontSize: 13,
    minWidth: 14,
    textAlign: 'center',
  },
  reasonButtonWrap: {
    marginLeft: 'auto',
  },
  reasonButtonInset: {
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  reasonButtonText: {
    ...neumoText.caption,
    fontSize: 10,
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: neumo.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});