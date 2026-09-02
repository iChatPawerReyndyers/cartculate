import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store, createStore } from '../api/storeApi';
import { sanitizeDecimalInput, isValidPositiveNumber } from '../utils/inputSanitization';
import { UNIT_OPTIONS, UNIT_MAX_LENGTH } from '../utils/units';
import { CategoryDefaultStore } from '../types';
import SelectField from './SelectField';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

const ADD_NEW_CATEGORY_VALUE = '__add_new_category__';
const ADD_NEW_STORE_VALUE = '__add_new_store__';
const ADD_NEW_UNIT_VALUE = '__add_new_unit__';
const NO_UNIT_VALUE = '__no_unit__';

/**
 * Resolves which store should be this product's default, per the
 * hierarchy: 1) an explicit product-level pick (if it still has a valid
 * price row), 2) the category's default store (if it also has a valid
 * price row here), 3) whichever priced row is cheapest. Returns null
 * only if there are no valid price rows at all to pick from.
 *
 * Used both on initial load (preferredStoreId = the product's own saved
 * default) and whenever price rows change out from under a previous
 * pick (preferredStoreId = null, since that explicit choice no longer
 * applies once its own row is gone - falls through to tiers 2/3).
 */
function resolveDefaultStoreId(
  rows: PriceRow[],
  preferredStoreId: string | null,
  categoryStoreId: string | null
): string | null {
  const validRows = rows.filter(
    (r) => r.storeId !== ADD_NEW_STORE_VALUE && r.priceText.trim() !== '' && !isNaN(parseFloat(r.priceText))
  );
  if (validRows.length === 0) return null;
  if (preferredStoreId && validRows.some((r) => r.storeId === preferredStoreId)) return preferredStoreId;
  if (categoryStoreId && validRows.some((r) => r.storeId === categoryStoreId)) return categoryStoreId;
  let cheapest = validRows[0];
  for (const r of validRows) {
    if (parseFloat(r.priceText) < parseFloat(cheapest.priceText)) cheapest = r;
  }
  return cheapest.storeId;
}

export interface ExistingProductPrice {
  storeId: string;
  priceAmount: number;
  /**
   * Internal bookkeeping only - there's no "This is different for me"
   * toggle in the UI anymore (removed per request: editing a price here
   * always writes the shared baseline everyone sees). This flag just
   * lets the modal detect "this store used to have a personal override"
   * so saving can automatically clear it - otherwise a stale override
   * would keep shadowing the shared price you just set (see
   * storePriceApi.ts's fetchAllStorePrices doc comment: personal always
   * wins over shared when both exist), and the price update wouldn't
   * actually show up in the Pricing tab like it should.
   */
  isPersonalOverride?: boolean;
}

export interface ProductSaveResult {
  itemId?: string;
  name: string;
  category: string;
  unit: string | null;
  isIngredient: boolean;
  defaultStoreId: string | null | undefined;
  priceRows: { storeId: string; price: number }[];
  /** Price rows removed entirely (via the row's own remove button). */
  removedStoreIds: string[];
  /**
   * Every store where this item used to have CURRENT_USER_ID's personal
   * override, cleared unconditionally now that there's no toggle to
   * decide whether to keep it - see ExistingProductPrice.isPersonalOverride.
   */
  clearedPersonalStoreIds: string[];
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
 * is inset. SelectField (category/default-store pickers) already
 * carries the neumorphic look internally. Unit is a plain inset text
 * field, not a SelectField, since it's now free text (5-char cap)
 * rather than a fixed picker list - see units.ts.
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
  const [unit, setUnit] = useState<string | null>(null);
  const [unitPickerValue, setUnitPickerValue] = useState<string>(UNIT_OPTIONS[0]);
  const [isIngredient, setIsIngredient] = useState(false);
  const [defaultStorePickerValue, setDefaultStorePickerValue] = useState<string | null>(null);
  const [priceRows, setPriceRows] = useState<PriceRow[]>([]);
  const [originalStoreIds, setOriginalStoreIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(existingName ?? '');
    const initialCategory = existingCategory ?? categories[0] ?? '';
    setCategoryPickerValue(initialCategory);
    setCustomCategoryText('');
    const initialUnit = existingUnit ?? null;
    setUnit(initialUnit);
    setUnitPickerValue(initialUnit === null ? NO_UNIT_VALUE : UNIT_OPTIONS.includes(initialUnit) ? initialUnit : ADD_NEW_UNIT_VALUE);
    // For a brand-new product (existingIsIngredient undefined), prefill
    // from the initially-selected category's default instead of always
    // starting false - see the SelectField onChange above for the
    // matching prefill when the user then changes category.
    if (existingIsIngredient !== undefined) {
      setIsIngredient(existingIsIngredient);
    } else {
      const entry = categoryDefaultStores.find((c) => c.category === initialCategory);
      setIsIngredient(entry?.defaultIsIngredient ?? false);
    }

    const initialRows: PriceRow[] =
      existingPrices && existingPrices.length > 0
        ? existingPrices.map((p) => ({
            key: `${p.storeId}-${Date.now()}-${Math.random()}`,
            storeId: p.storeId,
            newStoreText: '',
            priceText: p.priceAmount.toFixed(2),
          }))
        : stores.length > 0
        ? [{ key: `${Date.now()}`, storeId: stores[0].id, newStoreText: '', priceText: '' }]
        : [];

    setPriceRows(initialRows);
    setOriginalStoreIds(existingPrices ? existingPrices.map((p) => p.storeId) : []);

    // Resolve using the rows we JUST computed above, not the `priceRows`
    // state var - that won't reflect the setPriceRows call above until
    // next render, so reading it here would still see last time's rows.
    const initialCategoryStoreId = categoryDefaultStores.find((c) => c.category === initialCategory)?.storeId ?? null;
    setDefaultStorePickerValue(resolveDefaultStoreId(initialRows, existingDefaultStoreId ?? null, initialCategoryStoreId));
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
    categoryDefaultStores,
  ]);

  // If whatever store was selected as the default no longer has a valid
  // price row (its row got removed, its store was switched, or its price
  // was cleared), re-resolve via tiers 2/3 of the hierarchy (category
  // default, then cheapest) so the radio group always has a selection.
  // Does NOT touch a still-valid explicit pick - tier 1 (an existing,
  // still-priced choice) always wins over re-deriving from scratch.
  useEffect(() => {
    const stillValid = priceRows.some(
      (r) =>
        r.storeId === defaultStorePickerValue &&
        r.storeId !== ADD_NEW_STORE_VALUE &&
        r.priceText.trim() !== '' &&
        !isNaN(parseFloat(r.priceText))
    );
    if (!stillValid) {
      const currentCategory =
        categoryPickerValue === ADD_NEW_CATEGORY_VALUE ? customCategoryText.trim() : categoryPickerValue;
      const categoryStoreId = categoryDefaultStores.find((c) => c.category === currentCategory)?.storeId ?? null;
      setDefaultStorePickerValue(resolveDefaultStoreId(priceRows, null, categoryStoreId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRows]);

  const handleAddPriceRow = () => {
    setPriceRows((current) => {
      const usedStoreIds = new Set(current.filter((r) => r.storeId !== ADD_NEW_STORE_VALUE).map((r) => r.storeId));
      const nextAvailableStore = stores.find((store) => !usedStoreIds.has(store.id));
      return [
        ...current,
        {
          key: `${Date.now()}-${Math.random()}`,
          storeId: nextAvailableStore ? nextAvailableStore.id : ADD_NEW_STORE_VALUE,
          newStoreText: '',
          priceText: '',
        },
      ];
    });
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

  const categoryOptions = [
    ...categories.map((c) => ({ label: c, value: c })),
    { label: '+ Add new category...', value: ADD_NEW_CATEGORY_VALUE },
  ];

  const unitOptions = [
    { label: 'No unit (count)', value: NO_UNIT_VALUE },
    ...UNIT_OPTIONS.map((u) => ({ label: u, value: u })),
    { label: '+ Add custom unit...', value: ADD_NEW_UNIT_VALUE },
  ];

  /**
   * Excludes stores already priced by a DIFFERENT row, so the same store
   * can't be picked twice for one product - two price rows for the same
   * store would just silently overwrite each other on save, with no
   * indication in the UI of which one "won". The row's own currently
   * selected store is never excluded from its own list (filtered by key,
   * not by storeId), so switching it back to what it already is still
   * works normally.
   */
  const storeOptionsForRow = (rowKey: string) => {
    const usedElsewhere = new Set(
      priceRows.filter((r) => r.key !== rowKey && r.storeId !== ADD_NEW_STORE_VALUE).map((r) => r.storeId)
    );
    return [
      ...stores.filter((store) => !usedElsewhere.has(store.id)).map((store) => ({ label: store.name, value: store.id })),
      { label: '+ Add new store...', value: ADD_NEW_STORE_VALUE },
    ];
  };

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
      // No toggle exists anymore to choose "keep this as my personal
      // price" - every price entered here is always the shared baseline,
      // so any store that used to have a personal override for this item
      // gets it cleared unconditionally. Without this, a stale override
      // would keep shadowing the shared price just set (personal always
      // wins over shared when resolving what to display - see
      // storePriceApi.ts's fetchAllStorePrices), and the edit wouldn't
      // actually show up in the Pricing tab.
      const clearedPersonalStoreIds = (existingPrices ?? [])
        .filter((p) => p.isPersonalOverride)
        .map((p) => p.storeId);

      // defaultStorePickerValue is already the fully hierarchy-resolved
      // choice (see resolveDefaultStoreId) - send it directly. The one
      // exception: a brand-new product with no price rows yet at all has
      // nothing to resolve from (null) - in that case, send undefined
      // instead of null so the backend's own creation-time category-
      // default assignment still runs (see ExistingProductPrice's doc
      // comment / the CategoryDefaultStore-at-creation-time behavior).
      const chosenDefaultStoreId: string | null | undefined =
        defaultStorePickerValue === null && mode === 'add' ? undefined : defaultStorePickerValue;

      await onSave({
        itemId: existingItemId,
        name: name.trim(),
        category: effectiveCategory,
        unit,
        isIngredient,
        defaultStoreId: chosenDefaultStoreId,
        priceRows: validRows,
        removedStoreIds,
        clearedPersonalStoreIds,
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoiding}>
        <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
          >
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
                // Prefill the Ingredient toggle from this category's default -
                // only for NEW products (mode==='add'), never for an existing
                // one being edited, so changing an item's category never
                // silently flips a toggle the user already set explicitly for
                // that specific product. See CategoryDefaultStoresCard.tsx.
                if (mode === 'add' && value !== ADD_NEW_CATEGORY_VALUE) {
                  const entry = categoryDefaultStores.find((c) => c.category === value);
                  setIsIngredient(entry?.defaultIsIngredient ?? false);
                }
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
            <SelectField
              value={unitPickerValue}
              options={unitOptions}
              sheetTitle="Unit"
              onChange={(value) => {
                setUnitPickerValue(value);
                if (value === NO_UNIT_VALUE) setUnit(null);
                else if (value !== ADD_NEW_UNIT_VALUE) setUnit(value);
              }}
            />

            {unitPickerValue === ADD_NEW_UNIT_VALUE && (
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.newValueInsetWrap}>
                <TextInput
                  style={styles.newValueInput}
                  value={unit ?? ''}
                  onChangeText={(text) => setUnit(text.slice(0, UNIT_MAX_LENGTH))}
                  placeholder="Type your custom unit (e.g. sachet)"
                  placeholderTextColor={neumo.textMuted}
                  maxLength={UNIT_MAX_LENGTH}
                  autoCapitalize="none"
                  autoFocus
                />
              </NeumoInset>
            )}

            <TouchableOpacity
              style={styles.ingredientToggleRow}
              onPress={() => setIsIngredient((v) => !v)}
              activeOpacity={0.7}
            >
              <NeumoInset borderRadius={11} style={[styles.toggleTrack, isIngredient && styles.toggleTrackOn]}>
                <View style={[styles.toggleThumb, isIngredient && styles.toggleThumbOn]} />
              </NeumoInset>
              <Text style={styles.ingredientToggleLabel}>Can be a recipe ingredient</Text>
            </TouchableOpacity>

            <Text style={[styles.label, styles.priceListLabel]}>Prices per store</Text>
            <Text style={styles.hintText}>
              Pick which store's price is this product's default. If that store's price is later removed, this
              falls back to the category's default store, then the cheapest price.
            </Text>
            <View>
              {priceRows.map((row) => {
                const isDefault = row.storeId !== ADD_NEW_STORE_VALUE && defaultStorePickerValue === row.storeId;
                return (
                  <NeumoRaised key={row.key} borderRadius={12} distance={3} style={styles.priceRowGroup} fullWidth>
                    <View style={styles.priceRow}>
                      <TouchableOpacity
                        onPress={() => row.storeId !== ADD_NEW_STORE_VALUE && setDefaultStorePickerValue(row.storeId)}
                        disabled={row.storeId === ADD_NEW_STORE_VALUE}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
                        style={styles.radioWrap}
                      >
                        <View style={[styles.radioOuter, isDefault && styles.radioOuterSelected]}>
                          {isDefault && <View style={styles.radioInner} />}
                        </View>
                      </TouchableOpacity>
                      <View style={styles.storeSelectWrap}>
                        <SelectField
                          value={row.storeId}
                          options={storeOptionsForRow(row.key)}
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
                );
              })}
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
        </KeyboardAvoidingView>
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
   * BUGFIX (shadow clipping): same issue and same fix as
   * NewRecipeModal.tsx's formScroll comment - `sheet`'s padding:20 is
   * outside this ScrollView, so full-width price row cards sat flush
   * against this ScrollView's own clip edge with no room for their
   * boxShadow to render on the left/right without being cut.
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
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: neumo.accent,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    shadowColor: neumo.shadowDark,
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 2,
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
  radioWrap: {
    paddingRight: 2,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: neumo.shadowDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: neumo.accent,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: neumo.accent,
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