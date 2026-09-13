import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Item, Recipe } from '../types';
import { Store } from '../api/storeApi';
import { CategoryDefaultStore } from '../types';
import { RecipeIngredientInput } from '../api/recipeApi';
import { sanitizeDecimalInput, sanitizeIntegerInput, isValidPositiveNumber } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';
import SelectField from './SelectField';
import IngredientPickerModal from './IngredientPickerModal';
import { mergeCategories } from '../utils/categories';
import { UNIT_OPTIONS, UNIT_MAX_LENGTH } from '../utils/units';

const AUTO_STORE_VALUE = '__auto__';
const NO_UNIT_VALUE = '__no_unit__';
const ADD_NEW_UNIT_VALUE = '__add_new_unit__';

/** Maps a row's raw `unit` value to the SelectField option it corresponds
 * to - null (countable item, e.g. "2 carrots") gets its own option since
 * it isn't just "no selection yet", it's a meaningful, saved choice. */
function unitPickerValueFor(unit: string | null, customUnits: string[]): string {
  if (unit === null) return NO_UNIT_VALUE;
  if (UNIT_OPTIONS.includes(unit)) return unit;
  if (customUnits.includes(unit)) return unit;
  return ADD_NEW_UNIT_VALUE;
}

const unitOptions = [
  { label: 'No unit (count)', value: NO_UNIT_VALUE },
  ...UNIT_OPTIONS.map((u) => ({ label: u, value: u })),
  { label: '+ Add custom unit...', value: ADD_NEW_UNIT_VALUE },
];

interface IngredientRow {
  key: string;
  itemId: string | null;
  quantityText: string;
  unit: string | null;
  targetStoreId: string;
  isOptional: boolean;
  addToCart: boolean;
}

interface NewRecipeModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  items: Item[];
  stores: Store[];
  categoryDefaultStores: CategoryDefaultStore[];
  existingRecipe?: Recipe;
  onCancel: () => void;
  onSave: (name: string, ingredients: RecipeIngredientInput[]) => void;
  isSaving: boolean;
  /** Bubbles a product created via the ingredient picker's "+ Add new
   * product" form up to the parent, so its items list is updated without
   * a full refetch. */
  onItemCreated: (item: Item) => void;
}

function makeEmptyRow(defaultItemId: string | null = null): IngredientRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    itemId: defaultItemId,
    quantityText: '1',
    unit: null,
    targetStoreId: AUTO_STORE_VALUE,
    isOptional: false,
    addToCart: true,
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
  categoryDefaultStores,
  existingRecipe,
  onCancel,
  onSave,
  isSaving,
  onItemCreated,
}: NewRecipeModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [pickerRowKey, setPickerRowKey] = useState<string | null>(null);
  const [customUnits, setCustomUnits] = useState<string[]>([]);

  const categories = useMemo(() => mergeCategories(items.map((i) => i.category)), [items]);

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
      setCustomUnits(
        existingRecipe.ingredients
          .map((ingredient) => ingredient.unit?.trim() ?? '')
          .filter((unit) => unit && !UNIT_OPTIONS.includes(unit))
          .filter((unit, index, units) => units.indexOf(unit) === index)
      );
      setRows(
        existingRecipe.ingredients.map((ing) => ({
          key: `${ing.itemId}-${Date.now()}-${Math.random()}`,
          itemId: ing.itemId,
          quantityText: String(ing.baseQuantity),
          unit: ing.unit,
          targetStoreId: ing.isCustomRouted ? ing.defaultStoreId : AUTO_STORE_VALUE,
          isOptional: ing.isOptional,
          addToCart: ing.addToCart !== false,
        }))
      );
    } else {
      setName('');
      setCustomUnits([]);
      setRows([makeEmptyRow()]);
    }
    // Initialize once per modal session. The parent item list changes when
    // the inline ingredient picker creates a product; re-running this effect
    // then would wipe the row that was just selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mode, existingRecipe]);

  const handleAddRow = () => {
    if (ingredientItems.length === 0) {
      Alert.alert(
        'No ingredients available',
        'None of your products are marked as ingredients yet. Go to the Pricing tab, edit a product, and turn on "Ingredient" for anything you cook with.'
      );
      return;
    }
    setRows((current) => [...current, makeEmptyRow()]);
  };

  const handleRemoveRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  const updateRow = (key: string, updates: Partial<IngredientRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...updates } : row)));
  };

  const commitCustomUnit = (rowKey: string, draft: string | null) => {
    const value = draft?.trim() ?? '';
    if (!value) return;
    setCustomUnits((current) => (current.includes(value) ? current : [...current, value]));
    updateRow(rowKey, { unit: value });
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
      if (!row.itemId) {
        Alert.alert('Select an ingredient', 'Choose a product for every ingredient row before saving.');
        return;
      }
      if (!isValidPositiveNumber(row.quantityText)) {
        Alert.alert('Check quantities', 'Every ingredient needs a quantity greater than 0.');
        return;
      }
      const quantity = parseFloat(row.quantityText);
      const item = items.find((i) => i.id === row.itemId);
      const normalizedUnit = row.unit && row.unit.trim().length > 0 ? row.unit.trim() : null;
      ingredients.push({
        itemId: row.itemId,
        itemName: item?.name ?? 'Unknown item',
        baseQuantity: quantity,
        unit: normalizedUnit,
        targetStoreId: row.targetStoreId === AUTO_STORE_VALUE ? null : row.targetStoreId,
        isOptional: row.isOptional,
        addToCart: row.addToCart,
      });
    }

    onSave(name.trim(), ingredients);
  };

  return (
    <>
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
        <View style={styles.overlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoiding}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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

              <Text style={[styles.label, styles.ingredientsLabel]}>Ingredients</Text>
              {rows.map((row) => (
                <NeumoRaised key={row.key} borderRadius={12} distance={4} style={styles.ingredientCardInner} fullWidth>
                  <View style={styles.ingredientRow}>
                    <TouchableOpacity
                      style={styles.itemPickerWrap}
                      onPress={() => setPickerRowKey(row.key)}
                      activeOpacity={0.7}
                    >
                      <NeumoInset borderRadius={neumo.radiusSm} style={styles.itemFieldInset}>
                        <Text style={styles.itemFieldText} numberOfLines={1}>
                          {items.find((i) => i.id === row.itemId)?.name ?? 'Select ingredient'}
                        </Text>
                        <Text style={styles.itemFieldChevron}>▾</Text>
                      </NeumoInset>
                    </TouchableOpacity>

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
                      <SelectField
                        value={unitPickerValueFor(row.unit, customUnits)}
                        options={[...unitOptions, ...customUnits.map((unit) => ({ label: unit, value: unit }))]}
                        sheetTitle="Unit"
                        onChange={(value) => {
                          if (value === NO_UNIT_VALUE) {
                            updateRow(row.key, { unit: null, quantityText: sanitizeIntegerInput(row.quantityText) });
                          } else if (value === ADD_NEW_UNIT_VALUE) {
                            updateRow(row.key, { unit: '' });
                          } else {
                            updateRow(row.key, { unit: value });
                          }
                        }}
                      />
                    </View>

                    <TouchableOpacity onPress={() => handleRemoveRow(row.key)}>
                      <NeumoRaised borderRadius={12} distance={2} style={styles.removeButtonInner}>
                        <Text style={styles.removeButtonText}>✕</Text>
                      </NeumoRaised>
                    </TouchableOpacity>
                  </View>

                  {unitPickerValueFor(row.unit, customUnits) === ADD_NEW_UNIT_VALUE && (
                    <NeumoInset borderRadius={neumo.radiusSm} style={styles.customUnitInsetWrap}>
                      <TextInput
                        style={styles.customUnitInput}
                        value={row.unit ?? ''}
                        onChangeText={(text) => updateRow(row.key, { unit: text.slice(0, UNIT_MAX_LENGTH) })}
                        onEndEditing={() => commitCustomUnit(row.key, row.unit)}
                        onSubmitEditing={() => commitCustomUnit(row.key, row.unit)}
                        returnKeyType="done"
                        placeholder="Type your custom unit (e.g. sachet)"
                        placeholderTextColor={neumo.textMuted}
                        maxLength={UNIT_MAX_LENGTH}
                        autoCapitalize="none"
                        autoFocus
                      />
                    </NeumoInset>
                  )}

                  <View style={styles.secondaryRow}>
                    <View style={styles.storePickerWrap}>
                      <SelectField
                        value={row.targetStoreId}
                        options={[
                          { label: 'Default store (auto)', value: AUTO_STORE_VALUE },
                          ...stores.map((store) => ({ label: store.name, value: store.id })),
                        ]}
                        sheetTitle="Store"
                        onChange={(targetStoreId) => updateRow(row.key, { targetStoreId })}
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.optionalToggle}
                      onPress={() => updateRow(row.key, { isOptional: !row.isOptional })}
                      activeOpacity={0.7}
                    >
                      {row.isOptional ? (
                        <NeumoAccentRaised borderRadius={4} distance={2} style={styles.optionalCheckbox}>
                          <Text style={styles.optionalCheckmark}>✓</Text>
                        </NeumoAccentRaised>
                      ) : (
                        <NeumoInset borderRadius={4} style={styles.optionalCheckbox} />
                      )}
                      <Text style={styles.optionalLabel}>Optional</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.optionalToggle}
                      onPress={() => updateRow(row.key, { addToCart: !row.addToCart })}
                      activeOpacity={0.7}
                    >
                      {row.addToCart ? (
                        <NeumoAccentRaised borderRadius={4} distance={2} style={styles.optionalCheckbox}>
                          <Text style={styles.optionalCheckmark}>✓</Text>
                        </NeumoAccentRaised>
                      ) : (
                        <NeumoInset borderRadius={4} style={styles.optionalCheckbox} />
                      )}
                      <Text style={styles.optionalLabel}>Add to cart</Text>
                    </TouchableOpacity>
                  </View>
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
          </KeyboardAvoidingView>
        </View>
        </Modal>

      <IngredientPickerModal
        visible={pickerRowKey !== null}
        items={ingredientItems}
        categories={categories}
        categoryDefaultStores={categoryDefaultStores}
        onCancel={() => setPickerRowKey(null)}
        onSelect={(item) => {
          if (pickerRowKey) updateRow(pickerRowKey, { itemId: item.id });
          setPickerRowKey(null);
        }}
        onItemCreated={onItemCreated}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58,67,88,0.4)',
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    width: '100%',
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
  /**
   * BUGFIX (shadow clipping): ScrollView clips its OWN content to its OWN
   * bounds - `sheet`'s padding:20 lives outside this ScrollView, so it
   * gave the title/name field/buttonRow breathing room but did nothing
   * for anything scrolling inside here. Full-width ingredient cards sat
   * flush against this ScrollView's own clip edge with zero slack, so
   * their boxShadow got hard-cut on the left/right sides instead of
   * fading - unlike CartScreen's list, which puts its horizontal padding
   * directly on the ScrollView's own contentContainerStyle for exactly
   * this reason. marginHorizontal here is negative, and
   * formScrollContent's paddingHorizontal is the same magnitude
   * positive - together they widen this ScrollView's own clip boundary
   * by 10px on each side (room for the shadow) while net content
   * position stays exactly where it was, still aligned with the
   * title/name field above.
   */
  formScroll: {
    flexShrink: 1,
    marginHorizontal: -10,
  },
  formScrollContent: {
    paddingHorizontal: 10,
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
  ingredientsLabel: {
    marginBottom: 10,
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
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
  itemFieldInset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  itemFieldText: {
    ...neumoText.body,
    fontSize: 14,
    color: neumo.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  itemFieldChevron: {
    fontSize: 11,
    color: neumo.textMuted,
  },
  qtyInsetWrap: {
    width: 54,
  },
  qtyInput: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 10,
    color: neumo.textPrimary,
  },
  unitPickerWrap: {
    width: 100,
  },
  customUnitInsetWrap: {
    marginTop: 8,
  },
  customUnitInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
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
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(120,129,150,0.18)',
  },
  storePickerWrap: {
    flex: 1,
  },
  optionalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  optionalCheckbox: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
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