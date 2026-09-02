import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, FlatList, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';
import { Item } from '../types';
import { createItem } from '../api/itemApi';
import { UNIT_OPTIONS, UNIT_MAX_LENGTH } from '../utils/units';
import SelectField from './SelectField';

const ADD_NEW_UNIT_VALUE = '__add_new_unit__';
const NO_UNIT_VALUE = '__no_unit__';

interface IngredientPickerModalProps {
  visible: boolean;
  /** Already filtered to isIngredient items and sorted - see NewRecipeModal's ingredientItems. */
  items: Item[];
  /** Category options for the inline "add new product" form - same list PriceCatalogView builds via mergeCategories(). */
  categories: string[];
  onCancel: () => void;
  onSelect: (item: Item) => void;
  /** Bubbles a freshly-created product up to the parent (RecipeScreen), so
   * its items list includes it for the rest of the New Recipe session
   * without needing a full refetch. */
  onItemCreated: (item: Item) => void;
}

/**
 * Full-screen-ish picker opened by tapping an ingredient row's item field
 * in NewRecipeModal. Replaces the old plain SelectField dropdown with a
 * searchable list, plus an inline "+ Add new product" form so a missing
 * product can be created without losing the in-progress recipe - saving
 * here calls the same POST /api/items createItem() the Price Catalog
 * uses, just with isIngredient forced true.
 */
export default function IngredientPickerModal({
  visible,
  items,
  categories,
  onCancel,
  onSelect,
  onItemCreated,
}: IngredientPickerModalProps) {
  const [query, setQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [unitPickerValue, setUnitPickerValue] = useState<string>(NO_UNIT_VALUE);
  const [customUnit, setCustomUnit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [items, query]);

  const resetAndClose = () => {
    setQuery('');
    setShowCreateForm(false);
    setNewName('');
    setNewCategory('');
    setUnitPickerValue(NO_UNIT_VALUE);
    setCustomUnit('');
    onCancel();
  };

  const handleSelectExisting = (item: Item) => {
    onSelect(item);
    resetAndClose();
  };

  const handleOpenCreateForm = () => {
    setNewName(query.trim());
    setNewCategory(categories[0] ?? '');
    setUnitPickerValue(NO_UNIT_VALUE);
    setCustomUnit('');
    setShowCreateForm(true);
  };

  const handleSaveNewProduct = async () => {
    const resolvedUnit = unitPickerValue === NO_UNIT_VALUE ? null : unitPickerValue === ADD_NEW_UNIT_VALUE ? customUnit.trim() : unitPickerValue;

    if (!newName.trim() || !newCategory || (unitPickerValue === ADD_NEW_UNIT_VALUE && !resolvedUnit)) {
      Alert.alert('Missing details', 'A product needs a name and category, plus a valid custom unit when selected.');
      return;
    }

    setIsSaving(true);
    try {
      const created = await createItem(newName.trim(), newCategory, resolvedUnit, /* isIngredient */ true);
      onItemCreated(created);
      onSelect(created);
      resetAndClose();
    } catch (err) {
      Alert.alert('Could not add product', 'Please check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const unitOptions = [
    ...UNIT_OPTIONS.map((u) => ({ label: u, value: u })),
    { label: '+ Add custom unit...', value: ADD_NEW_UNIT_VALUE },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={resetAndClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoiding}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Select ingredient</Text>

          {!showCreateForm && (
            <>
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.searchBox}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search products..."
                  placeholderTextColor={neumo.textMuted}
                  style={styles.searchInput}
                  autoFocus
                />
              </NeumoInset>

              {results.length === 0 ? (
                <Text style={styles.emptyText}>No products match your search.</Text>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(item) => item.id}
                  style={styles.resultList}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => handleSelectExisting(item)} activeOpacity={0.7}>
                      <NeumoRaised borderRadius={10} distance={3} style={styles.resultRow} fullWidth>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.resultMeta} numberOfLines={1}>
                          {item.category}
                          {item.unit ? ` · ${item.unit}` : ''}
                        </Text>
                      </NeumoRaised>
                    </TouchableOpacity>
                  )}
                />
              )}

              <TouchableOpacity onPress={handleOpenCreateForm} style={styles.addNewLink}>
                <Text style={styles.addNewLinkText}>+ Add new product</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={resetAndClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </>
          )}

          {showCreateForm && (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View>
              <Text style={styles.label}>Product name</Text>
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.fieldInsetWrap}>
                <TextInput
                  style={styles.fieldInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="e.g. Tuna Chunks in Brine"
                  placeholderTextColor={neumo.textMuted}
                  autoFocus
                />
              </NeumoInset>

              <Text style={[styles.label, styles.fieldSpacingTop]}>Category</Text>
              <SelectField
                value={newCategory}
                options={categories.map((c) => ({ label: c, value: c }))}
                sheetTitle="Category"
                onChange={setNewCategory}
              />

              <Text style={[styles.label, styles.fieldSpacingTop]}>Unit</Text>
              <SelectField
                value={unitPickerValue}
                options={unitOptions}
                sheetTitle="Unit"
                onChange={setUnitPickerValue}
              />
              {unitPickerValue === ADD_NEW_UNIT_VALUE && (
                <NeumoInset borderRadius={neumo.radiusSm} style={styles.fieldInsetWrap}>
                  <TextInput
                    style={styles.fieldInput}
                    value={customUnit}
                    onChangeText={(text) => setCustomUnit(text.slice(0, UNIT_MAX_LENGTH))}
                    placeholder="Type your custom unit (e.g. sachet)"
                    placeholderTextColor={neumo.textMuted}
                    maxLength={UNIT_MAX_LENGTH}
                    autoCapitalize="none"
                    autoFocus
                  />
                </NeumoInset>
              )}

              <View style={styles.formButtonRow}>
                <TouchableOpacity
                  style={styles.formCancelWrap}
                  onPress={() => setShowCreateForm(false)}
                  disabled={isSaving}
                >
                  <NeumoInset borderRadius={10} style={styles.formCancelInset}>
                    <Text style={styles.formCancelText}>Back</Text>
                  </NeumoInset>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.formSaveWrap}
                  onPress={handleSaveNewProduct}
                  disabled={isSaving}
                >
                  <View style={[styles.formSaveInner, isSaving && styles.formSaveDisabled]}>
                    <Text style={styles.formSaveText}>{isSaving ? 'Saving…' : 'Save & select'}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            </ScrollView>
          )}
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58,67,88,0.35)',
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    width: '100%',
  },
  sheet: {
    backgroundColor: neumo.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },
  title: {
    ...neumoText.subheading,
    fontSize: 16,
    color: neumo.textPrimary,
    marginBottom: 10,
  },
  searchBox: {
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    ...neumoText.body,
    fontSize: 14,
    color: neumo.textPrimary,
    paddingVertical: 10,
  },
  emptyText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
    paddingVertical: 20,
    textAlign: 'center',
  },
  resultList: {
    marginBottom: 4,
  },
  resultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  resultName: {
    ...neumoText.body,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  resultMeta: {
    ...neumoText.caption,
    fontSize: 11,
    color: neumo.textSecondary,
    marginTop: 2,
  },
  addNewLink: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.35)',
    marginTop: 4,
  },
  addNewLinkText: {
    ...neumoText.subheading,
    fontSize: 13,
    color: neumo.accentDark,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
  },
  label: {
    ...neumoText.caption,
    fontSize: 12,
    marginBottom: 4,
  },
  fieldSpacingTop: {
    marginTop: 12,
  },
  fieldInsetWrap: {
    marginBottom: 2,
  },
  fieldInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  formButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  formCancelWrap: {
    flex: 1,
  },
  formCancelInset: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  formCancelText: {
    ...neumoText.heading,
    fontSize: 14,
  },
  formSaveWrap: {
    flex: 2,
  },
  formSaveInner: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: neumo.accent,
  },
  formSaveDisabled: {
    opacity: 0.55,
  },
  formSaveText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
});