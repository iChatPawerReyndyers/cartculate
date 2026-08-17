import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store, createStore } from '../api/storeApi';
import { sanitizeDecimalInput, isValidPositiveNumber } from '../utils/inputSanitization';
import { UNIT_OPTIONS } from '../utils/units';
import { CategoryDefaultStore } from '../types';
import SelectField from './SelectField';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

const ADD_NEW_CATEGORY_VALUE = '__add_new_category__';
const ADD_NEW_STORE_VALUE = '__add_new_store__';
const NO_STORE_OVERRIDE_VALUE = '__no_override__';

export interface ExistingProductPrice {
  storeId: string;
  priceAmount: number;
}

export interface ProductSaveResult {
  itemId?: string;
  name: string;
  category: string;
  unit: string;
  isIngredient: boolean;
  defaultStoreId: string | null | undefined;
  priceRows: { storeId: string; price: number }[];
  removedStoreIds: string[];
}

interface ProductModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  stores: Store[];
  categories: string[];
  categoryDefaultStores: CategoryDefaultStore[];
  existingItemId?: string;
  existingName?: string;
  existingCategory?: string;
  existingUnit?: string | null;
  existingIsIngredient?: boolean;
  existingDefaultStoreId?: string | null;
  existingPrices?: ExistingProductPrice[];
  onCancel: () => void;
  onSave: (result: ProductSaveResult) => Promise<void>;
  onStoreCreated?: (store: Store) => void;
}

interface PriceRow {
  key: string;
  storeId: string;
  newStoreText: string;
  priceText: string;
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * the name field, new-category/new-store inline inputs, and per-store
 * price inputs are inset wells; the ingredient toggle keeps its own
 * pill-track look (functional switch, not a text field); each price row
 * is a full-width raised card; Save is a raised accent button and Cancel
 * is inset. SelectField (category/unit/default-store pickers) already
 * carries the neumorphic look internally - no changes needed at the call
 * sites here. No logic changed in this pass.
 */
export default function ProductModal({
  visible,
  mode,
  stores,
  categories,
  categoryDefaultStores,
  existingItemId,
  existingName,
  existingCategory,
  existingUnit,
  existingIsIngredient,
  existingDefaultStoreId,
  existingPrices,
  onCancel,
  onSave,
  onStoreCreated,
}: ProductModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [categoryPickerValue, setCategoryPickerValue] = useState('');
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [isIngredient, setIsIngredient] = useState(false);
  const [defaultStorePickerValue, setDefaultStorePickerValue] = useState(NO_STORE_OVERRIDE_VALUE);
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [originalStoreIds, setOriginalStoreIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(existingName ?? '');
    setCategoryPickerValue(existingCategory ?? categories[0] ?? '');
    setCustomCategoryText('');
    setUnit(existingUnit ?? UNIT_OPTIONS[0]);
    setIsIngredient(existingIsIngredient ?? false);
    setDefaultStorePickerValue(existingDefaultStoreId ?? NO_STORE_OVERRIDE_VALUE);

    if (existingPrices && existingPrices.length > 0) {
      setPriceRows(
        existingPrices.map((p) => ({
          key: `${p.storeId}-${Date.now()}-${Math.random()}`,
          storeId: p.storeId,
          newStoreText: '',
          priceText: p.priceAmount.toFixed(2),
        }))
      );
      setOriginalStoreIds(existingPrices.map((p) => p.storeId));
    } else {
      setPriceRows(
        stores.length > 0 ? [{ key: `${Date.now()}`, storeId: stores[0].id, newStoreText: '', priceText: '' }] : []
      );
      setOriginalStoreIds([]);
    }
  }, [
    visible,
    existingName,
    existingCategory,
    existingUnit,
    existingIsIngredient,
    existingDefaultStoreId,
    existingPrices,
    categories,
    stores,
  ]);

  const handleAddPriceRow = () => {
    setPriceRows((current) => [
      ...current,
      {
        key: `${Date.now()}-${Math.random()}`,
        storeId: stores.length > 0 ? stores[0].id : ADD_NEW_STORE_VALUE,
        newStoreText: '',
        priceText: '',
      },
    ]);
  };

  const handleRemovePriceRow = (key: string) => {
    setPriceRows((current) => current.filter((row) => row.key !== key));
  };

  const updatePriceRow = (key: string, updates: Partial<PriceRow>) => {
    setPriceRows((current) => current.map((row) => (row.key === key ? { ...row, ...updates } : row)));
  };

  const handleClose = () => {
    onCancel();
  };

  const effectiveCategoryForDefault =
    categoryPickerValue === ADD_NEW_CATEGORY_VALUE ? customCategoryText.trim() : categoryPickerValue;
  const categoryDefaultEntry = categoryDefaultStores.find((c) => c.category === effectiveCategoryForDefault);

  const categoryOptions = [
    ...categories.map((c) => ({ label: c, value: c })),
    { label: '+ Add new category...', value: ADD_NEW_CATEGORY_VALUE },
  ];

  const unitOptions = UNIT_OPTIONS.map((opt) => ({ label: opt, value: opt }));

  const priceAtStore = (storeId: string): number | null => {
    const row = priceRows.find((r) => r.storeId === storeId && r.priceText);
    if (!row) return null;
    const parsed = parseFloat(row.priceText);
    return isNaN(parsed) ? null : parsed;
  };

  const defaultStoreOptions = [
    {
      label: categoryDefaultEntry
        ? `Use category default (${categoryDefaultEntry.storeName})`
        : 'Use category default (none set)',
      value: NO_STORE_OVERRIDE_VALUE,
    },
    ...stores.map((store) => {
      const price = priceAtStore(store.id);
      return {
        label: price !== null ? `${store.name} · ₱${price.toFixed(2)}` : store.name,
        value: store.id,
      };
    }),
  ];

  const storeOptionsForPriceRow = [
    ...stores.map((store) => ({ label: store.name, value: store.id })),
    { label: '+ Add new store...', value: ADD_NEW_STORE_VALUE },
  ];

  const handleSave = async () => {
    const effectiveCategory =
      categoryPickerValue === ADD_NEW_CATEGORY_VALUE ? customCategoryText.trim() : categoryPickerValue;

    if (!name.trim()) {
      Alert.alert('Name required', 'Give this product a name.');
      return;
    }
    if (!effectiveCategory) {
      Alert.alert(
        'Category required',
        categoryPickerValue === ADD_NEW_CATEGORY_VALUE
          ? 'Type a name for your new category.'
          : 'Pick a category for this product.'
      );
      return;
    }
    if (!unit) {
      Alert.alert('Unit required', 'Pick a unit for this product.');
      return;
    }

    for (const row of priceRows) {
      if (row.storeId === ADD_NEW_STORE_VALUE && !row.newStoreText.trim()) {
        Alert.alert('Store name required', 'Type a name for the new store, or remove that price row.');
        return;
      }
    }

    const rowsWithPrices = priceRows.filter((row) => row.priceText);
    for (const row of rowsWithPrices) {
      if (!isValidPositiveNumber(row.priceText, /* allowZero */ true)) {
        Alert.alert('Check prices', 'Every entered price must be a valid number.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const resolvedStoreIdByNewName = new Map<string, string>();
      const validRows: { storeId: string; price: number }[] = [];

      for (const row of rowsWithPrices) {
        let resolvedStoreId = row.storeId;

        if (row.storeId === ADD_NEW_STORE_VALUE) {
          const trimmedName = row.newStoreText.trim();
          const cachedId = resolvedStoreIdByNewName.get(trimmedName.toLowerCase());
          if (cachedId) {
            resolvedStoreId = cachedId;
          } else {
            const created = await createStore(trimmedName);
            resolvedStoreIdByNewName.set(trimmedName.toLowerCase(), created.id);
            resolvedStoreId = created.id;
            if (onStoreCreated) onStoreCreated(created);
          }
        }

        validRows.push({ storeId: resolvedStoreId, price: parseFloat(row.priceText) });
      }

      const currentStoreIds = new Set(validRows.map((r) => r.storeId));
      const removedStoreIds = originalStoreIds.filter((id) => !currentStoreIds.has(id));

      const chosenDefaultStoreId: string | null | undefined =
        defaultStorePickerValue === NO_STORE_OVERRIDE_VALUE
          ? mode === 'edit'
            ? null
            : undefined
          : defaultStorePickerValue;

      await onSave({
        itemId: existingItemId,
        name: name.trim(),
        category: effectiveCategory,
        unit,
        isIngredient,
        defaultStoreId: chosenDefaultStoreId,
        priceRows: validRows,
        removedStoreIds,
      });
    } catch (err) {
      Alert.alert('Could not save product', 'Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{mode === 'add' ? 'Add product' : 'Edit product'}</Text>

            <Text style={styles.label}>Name</Text>
            <NeumoInset borderRadius={neumo.radiusSm} style={styles.nameInsetWrap}>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Toothpaste"
                placeholderTextColor={neumo.textMuted}
              />
            </NeumoInset>

            <Text style={styles.label}>Category</Text>
            <SelectField
              value={categoryPickerValue}
              options={categoryOptions}
              sheetTitle="Category"
              onChange={(value) => {
                setCategoryPickerValue(value);
                if (value !== ADD_NEW_CATEGORY_VALUE) setCustomCategoryText('');
              }}
            />

            {categoryPickerValue === ADD_NEW_CATEGORY_VALUE && (
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.newValueInsetWrap}>
                <TextInput
                  style={styles.newValueInput}
                  value={customCategoryText}
                  onChangeText={setCustomCategoryText}
                  placeholder="Type your new category name"
                  placeholderTextColor={neumo.textMuted}
                  autoFocus
                />
              </NeumoInset>
            )}

            <Text style={[styles.label, styles.fieldSpacingTop]}>Unit</Text>
            <SelectField value={unit} options={unitOptions} sheetTitle="Unit" onChange={setUnit} />

            <TouchableOpacity
              style={styles.ingredientToggleRow}
              onPress={() => setIsIngredient((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.toggleTrack, isIngredient && styles.toggleTrackOn]}>
                <View style={[styles.toggleThumb, isIngredient && styles.toggleThumbOn]} />
              </View>
              <Text style={styles.ingredientToggleLabel}>Can be a recipe ingredient</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Default store</Text>
            <SelectField
              value={defaultStorePickerValue}
              options={defaultStoreOptions}
              sheetTitle="Default store"
              onChange={setDefaultStorePickerValue}
            />
            <Text style={styles.hintText}>
              {defaultStorePickerValue === NO_STORE_OVERRIDE_VALUE
                ? 'Recipes and other auto-routing will use the category default above (or cheapest price if none is set).'
                : 'This overrides the category default everywhere this product is auto-routed - recipes included.'}
            </Text>

            <Text style={[styles.label, styles.priceListLabel]}>Prices per store</Text>
            <View>
              {priceRows.map((row) => (
                <NeumoRaised key={row.key} borderRadius={12} distance={3} style={styles.priceRowGroup} fullWidth>
                  <View style={styles.priceRow}>
                    <View style={styles.storeSelectWrap}>
                      <SelectField
                        value={row.storeId}
                        options={storeOptionsForPriceRow}
                        sheetTitle="Store"
                        onChange={(storeId) => updatePriceRow(row.key, { storeId })}
                      />
                    </View>
                    <NeumoInset borderRadius={6} style={styles.priceInsetWrap}>
                      <TextInput
                        style={styles.priceInput}
                        value={row.priceText}
                        onChangeText={(text) => updatePriceRow(row.key, { priceText: sanitizeDecimalInput(text, 2) })}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={neumo.textMuted}
                      />
                    </NeumoInset>
                    <TouchableOpacity onPress={() => handleRemovePriceRow(row.key)}>
                      <NeumoRaised borderRadius={12} distance={2} style={styles.removeButtonInner}>
                        <Text style={styles.removeButtonText}>✕</Text>
                      </NeumoRaised>
                    </TouchableOpacity>
                  </View>
                  {row.storeId === ADD_NEW_STORE_VALUE && (
                    <NeumoInset borderRadius={neumo.radiusSm} style={styles.newStoreInsetWrap}>
                      <TextInput
                        style={styles.newStoreInput}
                        value={row.newStoreText}
                        onChangeText={(text) => updatePriceRow(row.key, { newStoreText: text })}
                        placeholder="Type the new store's name"
                        placeholderTextColor={neumo.textMuted}
                        autoFocus
                      />
                    </NeumoInset>
                  )}
                </NeumoRaised>
              ))}
            </View>

            <TouchableOpacity onPress={handleAddPriceRow}>
              <View style={styles.addPriceRowButton}>
                <Text style={styles.addPriceRowButtonText}>+ Add store price</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButtonWrap} onPress={handleClose} disabled={isSaving}>
              <NeumoInset borderRadius={10} style={styles.cancelButtonInset}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </NeumoInset>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButtonWrap} onPress={handleSave} disabled={isSaving}>
              <NeumoAccentRaised
                borderRadius={10}
                distance={4}
                fullWidth
                style={[styles.saveButtonInner, isSaving && styles.saveButtonDisabled]}
              >
                <Text style={styles.saveButtonText}>{isSaving ? 'Saving…' : 'Save product'}</Text>
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
  fieldSpacingTop: {
    marginTop: 14,
  },
  priceListLabel: {
    marginTop: 4,
  },
  nameInsetWrap: {
    marginBottom: 12,
  },
  nameInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  newValueInsetWrap: {
    marginTop: 8,
  },
  newValueInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  hintText: {
    ...neumoText.caption,
    fontSize: 10,
    color: neumo.textMuted,
    marginTop: 4,
    marginBottom: 14,
  },
  ingredientToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: neumo.surfaceInset,
    borderWidth: 1,
    borderColor: 'rgba(166,176,195,0.4)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: neumo.accent,
    borderColor: neumo.accentDark,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  ingredientToggleLabel: {
    ...neumoText.body,
    fontSize: 13,
  },
  priceRowGroup: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeSelectWrap: {
    flex: 1,
  },
  priceInsetWrap: {
    width: 70,
  },
  priceInput: {
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
  newStoreInsetWrap: {
    marginTop: 6,
  },
  newStoreInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: neumo.textPrimary,
  },
  addPriceRowButton: {
    borderWidth: 1,
    borderColor: neumo.shadowDark,
    borderStyle: 'dashed',
    borderRadius: neumo.radiusSm,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  addPriceRowButtonText: {
    ...neumoText.subheading,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
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