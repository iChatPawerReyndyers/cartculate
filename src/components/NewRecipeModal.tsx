import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Item, Recipe } from '../types';
import { Store } from '../api/storeApi';
import { RecipeIngredientInput } from '../api/recipeApi';
import { sanitizeDecimalInput, sanitizeIntegerInput, isValidPositiveNumber } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';
import SelectField from './SelectField';
import { UNIT_MAX_LENGTH } from '../utils/units';

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
 * VISUAL: previously the odd one out - this modal used native OS <Picker>
 * dropdowns in a fixed-height (70%) sheet, while ProductModal (Pricing
 * tab) already used the custom SelectField bottom-sheet dropdown in a
 * content-based (maxHeight 88%) sheet. Now matches ProductModal exactly:
 * SelectField for Ingredient/Unit/Store, maxHeight sheet, and the whole
 * form (not just the ingredient rows) scrolls together with Cancel/Save
 * pinned below - see ProductModal.tsx for the reference pattern. No
 * logic changed. Each ingredient card still passes `fullWidth` to
 * NeumoRaised - see neumorphic.tsx's file header for why Shadow-based
 * surfaces need that explicitly to stretch instead of shrinking to
 * content width.
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
    if (ingredientItems.length === 0) {
      Alert.alert(
        'No ingredients available',
        'None of your products are marked as ingredients yet. Go to the Pricing tab, edit a product, and turn on "Ingredient" for anything you cook with.'
      );
      return;
    }
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
          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
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
            {rows.map((row) => (
              <NeumoRaised key={row.key} borderRadius={12} distance={4} style={styles.ingredientCardInner} fullWidth>
                <View style={styles.ingredientRow}>
                  <View style={styles.itemPickerWrap}>
                    <SelectField
                      value={row.itemId}
                      options={ingredientItems.map((item) => ({ label: item.name, value: item.id }))}
                      sheetTitle="Ingredient"
                      onChange={(itemId) => updateRow(row.key, { itemId })}
                    />
                  </View>

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

                  <View style={styles.unitPickerWrap}>
                    <NeumoInset borderRadius={6} style={styles.unitInsetWrap}>
                      <TextInput
                        style={styles.unitInput}
                        value={row.unit ?? ''}
                        onChangeText={(text) => {
                          const trimmed = text.slice(0, UNIT_MAX_LENGTH);
                          updateRow(row.key, { unit: trimmed.length === 0 ? null : trimmed });
                        }}
                        placeholder="pc"
                        placeholderTextColor={neumo.textMuted}
                        maxLength={UNIT_MAX_LENGTH}
                        autoCapitalize="none"
                      />
                    </NeumoInset>
                  </View>

                  <TouchableOpacity onPress={() => handleRemoveRow(row.key)}>
                    <NeumoRaised borderRadius={12} distance={2} style={styles.removeButtonInner}>
                      <Text style={styles.removeButtonText}>✕</Text>
                    </NeumoRaised>
                  </TouchableOpacity>
                </View>

                <View style={styles.storeRoutingRow}>
                  <Text style={styles.storeRoutingLabel}>Store:</Text>
                  <View style={styles.storePickerWrap}>
                    <SelectField
                      value={row.targetStoreId}
                      options={[
                        { label: 'Default (auto)', value: AUTO_STORE_VALUE },
                        ...stores.map((store) => ({ label: store.name, value: store.id })),
                      ]}
                      sheetTitle="Store"
                      onChange={(targetStoreId) => updateRow(row.key, { targetStoreId })}
                    />
                  </View>
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

            <TouchableOpacity onPress={handleAddRow}>
              <View style={styles.addRowButton}>
                <Text style={styles.addRowButtonText}>+ Add ingredient</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

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
    maxHeight: '88%',
  },
  /**
   * BUGFIX: without flex:1 here, this ScrollView sized itself to its full
   * content height instead of bounding itself within `sheet`'s maxHeight -
   * on any recipe with content tall enough to overflow (even just one
   * ingredient row), the ScrollView rendered past the visible area and
   * behind the pinned Cancel/Save row below, which - being declared later
   * in JSX - sat on top in z-order and silently absorbed taps meant for
   * "+ Add ingredient" underneath it. flex:1 makes Yoga correctly size
   * this to (sheet's resolved height - buttonRow's height), the standard
   * RN pattern for "scrollable content + pinned footer".
   */
  /**
   * BUGFIX (attempt 2): flex:1 was wrong here - `sheet` isn't a
   * definite-height container, it's auto-sized to content up to
   * maxHeight, so flex:1 had no "available space" to expand into and
   * this ScrollView collapsed to zero height instead (wiping out the
   * entire form - name field, ingredient rows, the Add button, all of
   * it). flexShrink:1 is the correct fix for "scrollable body + pinned
   * footer inside an auto-sizing container": Yoga first sizes this to
   * its natural content height (so it's never zero when content fits),
   * and only shrinks it down to fit within sheet's maxHeight cap once
   * content actually overflows - which is exactly what "leave room for
   * the pinned buttonRow, but don't collapse otherwise" means.
   */
  formScroll: {
    flexShrink: 1,
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
  unitInsetWrap: {
    width: '100%',
  },
  unitInput: {
    textAlign: 'center',
    fontSize: 13,
    paddingVertical: 6,
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