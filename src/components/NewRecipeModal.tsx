import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Item, Recipe } from '../types';
import { Store } from '../api/storeApi';
import { RecipeIngredientInput } from '../api/recipeApi';
import { sanitizeDecimalInput, sanitizeIntegerInput, isValidPositiveNumber } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

const UNIT_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'pc', value: null },
  { label: 'g', value: 'g' },
  { label: 'kg', value: 'kg' },
  { label: 'pack', value: 'pack' },
];

const AUTO_STORE_VALUE = '__auto__';

interface IngredientRow {
  key: string;
  itemId: string;
  quantityText: string;
  unit: string | null;
  targetStoreId: string;
  isOptional: boolean;
}

interface NewRecipeModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  items: Item[];
  stores: Store[];
  existingRecipe?: Recipe;
  onCancel: () => void;
  onSave: (name: string, ingredients: RecipeIngredientInput[]) => void;
  isSaving: boolean;
}

function makeEmptyRow(defaultItemId: string): IngredientRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    itemId: defaultItemId,
    quantityText: '1',
    unit: null,
    targetStoreId: AUTO_STORE_VALUE,
    isOptional: false,
  };
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx.
 * BUGFIX: each ingredient card now passes `fullWidth` to NeumoRaised - see
 * neumorphic.tsx's file header for why Shadow-based surfaces need this
 * explicitly to stretch instead of shrinking to content width. Picker
 * dropdowns remain native <Picker> wrapped in an inset well (their
 * internal chrome isn't stylable the same way). No logic changed.
 */
export default function NewRecipeModal({
  visible,
  mode,
  items,
  stores,
  existingRecipe,
  onCancel,
  onSave,
  isSaving,
}: NewRecipeModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([]);

  const ingredientItems = useMemo(
    () =>
      items
        .filter((item) => item.isIngredient)
        .sort((a, b) => {
          const categoryCompare = a.category.localeCompare(b.category);
          return categoryCompare !== 0 ? categoryCompare : a.name.localeCompare(b.name);
        }),
    [items]
  );

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && existingRecipe) {
      setName(existingRecipe.name);
      setRows(
        existingRecipe.ingredients.map((ing) => ({
          key: `${ing.itemId}-${Date.now()}-${Math.random()}`,
          itemId: ing.itemId,
          quantityText: String(ing.baseQuantity),
          unit: ing.unit,
          targetStoreId: ing.isCustomRouted ? ing.defaultStoreId : AUTO_STORE_VALUE,
          isOptional: ing.isOptional,
        }))
      );
    } else {
      setName('');
      setRows(ingredientItems.length > 0 ? [makeEmptyRow(ingredientItems[0].id)] : []);
    }
  }, [visible, mode, existingRecipe, ingredientItems]);

  const handleAddRow = () => {
    if (ingredientItems.length === 0) return;
    setRows((current) => [...current, makeEmptyRow(ingredientItems[0].id)]);
  };

  const handleRemoveRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const updateRow = (key: string, updates: Partial<IngredientRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...updates } : row)));
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this recipe a name before saving.');
      return;
    }
    if (rows.length === 0) {
      Alert.alert('Add an ingredient', 'A recipe needs at least one ingredient.');
      return;
    }

    const ingredients: RecipeIngredientInput[] = [];
    for (const row of rows) {
      if (!isValidPositiveNumber(row.quantityText)) {
        Alert.alert('Check quantities', 'Every ingredient needs a quantity greater than 0.');
        return;
      }
      const quantity = parseFloat(row.quantityText);
      const item = items.find((i) => i.id === row.itemId);
      ingredients.push({
        itemId: row.itemId,
        itemName: item?.name ?? 'Unknown item',
        baseQuantity: quantity,
        unit: row.unit,
        targetStoreId: row.targetStoreId === AUTO_STORE_VALUE ? null : row.targetStoreId,
        isOptional: row.isOptional,
      });
    }

    onSave(name.trim(), ingredients);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <Text style={styles.title}>{mode === 'add' ? 'New recipe' : 'Edit recipe'}</Text>

          <Text style={styles.label}>Recipe name</Text>
          <NeumoInset borderRadius={neumo.radiusSm} style={styles.nameInsetWrap}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sinigang"
              placeholderTextColor={neumo.textMuted}
            />
          </NeumoInset>

          <Text style={styles.label}>Ingredients</Text>
          <ScrollView style={styles.rowsScroll}>
            {rows.map((row) => (
              <NeumoRaised key={row.key} borderRadius={12} distance={4} style={styles.ingredientCardInner} fullWidth>
                <View style={styles.ingredientRow}>
                  <NeumoInset borderRadius={7} style={styles.itemPickerWrap}>
                    <Picker
                      selectedValue={row.itemId}
                      onValueChange={(itemId: string) => updateRow(row.key, { itemId })}
                      style={styles.itemPicker}
                      mode="dropdown"
                    >
                      {ingredientItems.map((item) => (
                        <Picker.Item key={item.id} label={item.name} value={item.id} />
                      ))}
                    </Picker>
                  </NeumoInset>

                  <NeumoInset borderRadius={6} style={styles.qtyInsetWrap}>
                    <TextInput
                      style={styles.qtyInput}
                      value={row.quantityText}
                      onChangeText={(text) =>
                        updateRow(row.key, {
                          quantityText: row.unit === null ? sanitizeIntegerInput(text) : sanitizeDecimalInput(text, 2),
                        })
                      }
                      keyboardType="decimal-pad"
                    />
                  </NeumoInset>

                  <NeumoInset borderRadius={7} style={styles.unitPickerWrap}>
                    <Picker
                      selectedValue={row.unit}
                      onValueChange={(unit: string | null) => updateRow(row.key, { unit })}
                      style={styles.unitPicker}
                      mode="dropdown"
                    >
                      {UNIT_OPTIONS.map((opt) => (
                        <Picker.Item key={opt.label} label={opt.label} value={opt.value} />
                      ))}
                    </Picker>
                  </NeumoInset>

                  <TouchableOpacity onPress={() => handleRemoveRow(row.key)}>
                    <NeumoRaised borderRadius={12} distance={2} style={styles.removeButtonInner}>
                      <Text style={styles.removeButtonText}>✕</Text>
                    </NeumoRaised>
                  </TouchableOpacity>
                </View>

                <View style={styles.storeRoutingRow}>
                  <Text style={styles.storeRoutingLabel}>Store:</Text>
                  <NeumoInset borderRadius={7} style={styles.storePickerWrap}>
                    <Picker
                      selectedValue={row.targetStoreId}
                      onValueChange={(targetStoreId: string) => updateRow(row.key, { targetStoreId })}
                      style={styles.storePicker}
                      mode="dropdown"
                    >
                      <Picker.Item label="Default (auto)" value={AUTO_STORE_VALUE} />
                      {stores.map((store) => (
                        <Picker.Item key={store.id} label={store.name} value={store.id} />
                      ))}
                    </Picker>
                  </NeumoInset>
                </View>

                <TouchableOpacity
                  style={styles.optionalRow}
                  onPress={() => updateRow(row.key, { isOptional: !row.isOptional })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionalCheckbox, row.isOptional && styles.optionalCheckboxChecked]}>
                    {row.isOptional && <Text style={styles.optionalCheckmark}>✓</Text>}
                  </View>
                  <Text style={styles.optionalLabel}>Optional ingredient (e.g. garnish, can skip)</Text>
                </TouchableOpacity>
              </NeumoRaised>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={handleAddRow}>
            <View style={styles.addRowButton}>
              <Text style={styles.addRowButtonText}>+ Add ingredient</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButtonWrap} onPress={onCancel} disabled={isSaving}>
              <NeumoInset borderRadius={10} style={styles.cancelButtonInset}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </NeumoInset>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButtonWrap} onPress={handleSave} disabled={isSaving}>
              <NeumoAccentRaised
                borderRadius={10}
                distance={3}
                fullWidth
                style={[styles.saveButtonInner, isSaving && styles.saveButtonDisabled]}
              >
                <Text style={styles.saveButtonText}>{isSaving ? 'Saving…' : 'Save recipe'}</Text>
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
    height: '70%',
  },
  title: {
    ...neumoText.heading,
    fontSize: 18,
    marginBottom: 14,
  },
  label: {
    ...neumoText.caption,
    fontSize: 12,
    marginBottom: 4,
  },
  nameInsetWrap: {
    marginBottom: 16,
  },
  nameInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  rowsScroll: {
    flex: 1,
  },
  ingredientCardInner: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemPickerWrap: {
    flex: 2,
  },
  itemPicker: {
    color: neumo.textPrimary,
  },
  qtyInsetWrap: {
    width: 54,
  },
  qtyInput: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 6,
    color: neumo.textPrimary,
  },
  unitPickerWrap: {
    width: 90,
  },
  unitPicker: {
    color: neumo.textPrimary,
  },
  removeButtonInner: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 12,
    color: neumo.textSecondary,
  },
  storeRoutingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    marginBottom: 6,
  },
  storeRoutingLabel: {
    ...neumoText.caption,
    fontSize: 11,
    color: neumo.textMuted,
  },
  storePickerWrap: {
    flex: 1,
  },
  storePicker: {
    color: neumo.textPrimary,
  },
  optionalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 6,
  },
  optionalCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: neumo.shadowDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionalCheckboxChecked: {
    backgroundColor: neumo.accent,
    borderColor: neumo.accentDark,
  },
  optionalCheckmark: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  optionalLabel: {
    ...neumoText.caption,
    fontSize: 11,
    color: neumo.textMuted,
  },
  addRowButton: {
    borderWidth: 1,
    borderColor: neumo.shadowDark,
    borderStyle: 'dashed',
    borderRadius: neumo.radiusSm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  addRowButtonText: {
    ...neumoText.subheading,
    fontSize: 13,
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
  saveButtonWrap: {
    flex: 2,
  },
  saveButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
});