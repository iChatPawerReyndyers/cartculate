import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchItems, createItem } from '../api/itemApi';
import { fetchStores, createStore, Store } from '../api/storeApi';
import { updateStorePrices } from '../api/storePriceApi';
import { mergeCategories } from '../utils/categories';
import { UNIT_OPTIONS } from '../utils/units';
import { sanitizeDecimalInput, isValidPositiveNumber } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

const ADD_NEW_CATEGORY_VALUE = '__add_new_category__';
const ADD_NEW_STORE_VALUE = '__add_new_store__';

interface AddItemModalProps {
  visible: boolean;
  onCancel: () => void;
  onAdd: (itemId: string, storeId: string, quantity: number) => Promise<void>;
}

/**
 * See the original doc comment below for the full feature rationale -
 * unchanged.
 *
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * text inputs are inset wells, native <Picker> dropdowns sit in inset
 * wrappers (their internal chrome isn't stylable the same way), the
 * ingredient toggle keeps its own pill-track look, and Add/Cancel follow
 * the same accent-raised/inset split used everywhere else. No logic
 * changed.
 */
export default function AddItemModal({ visible, onCancel, onAdd }: AddItemModalProps) {
  const insets = useSafeAreaInsets();
  const [stores, setStores] = useState<Store[]>([]);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [name, setName] = useState('');
  const [categoryPickerValue, setCategoryPickerValue] = useState('');
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [isIngredient, setIsIngredient] = useState(false);
  const [storePickerValue, setStorePickerValue] = useState('');
  const [newStoreText, setNewStoreText] = useState('');
  const [priceText, setPriceText] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = mergeCategories(existingCategories);

  useEffect(() => {
    if (!visible) return;
    setLoadingOptions(true);
    Promise.all([fetchItems(), fetchStores()])
      .then(([itemData, storeData]) => {
        setExistingCategories(itemData.map((i) => i.category));
        setStores(storeData);
        setStorePickerValue((current) => current || storeData[0]?.id || ADD_NEW_STORE_VALUE);
        setCategoryPickerValue((current) => current || mergeCategories(itemData.map((i) => i.category))[0] || '');
      })
      .catch(() => {
        Alert.alert('Could not load form data', 'Please check your connection and try again.');
      })
      .finally(() => setLoadingOptions(false));
  }, [visible]);

  const resetForm = () => {
    setName('');
    setCategoryPickerValue('');
    setCustomCategoryText('');
    setUnit(UNIT_OPTIONS[0]);
    setIsIngredient(false);
    setStorePickerValue('');
    setNewStoreText('');
    setPriceText('');
    setQuantityText('1');
  };

  const handleClose = () => {
    resetForm();
    onCancel();
  };

  const handleAdd = async () => {
    const effectiveCategory =
      categoryPickerValue === ADD_NEW_CATEGORY_VALUE ? customCategoryText.trim() : categoryPickerValue;

    if (!name.trim()) {
      Alert.alert('Name required', 'Give this product a name.');
      return;
    }
    if (!effectiveCategory) {
      Alert.alert('Category required', 'Pick or type a category for this product.');
      return;
    }
    if (storePickerValue === ADD_NEW_STORE_VALUE && !newStoreText.trim()) {
      Alert.alert('Store name required', 'Type a name for the new store.');
      return;
    }
    if (!isValidPositiveNumber(priceText, /* allowZero */ true)) {
      Alert.alert('Check price', 'Enter a valid price for this store.');
      return;
    }
    if (!isValidPositiveNumber(quantityText)) {
      Alert.alert('Check quantity', 'Quantity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      const item = await createItem(name.trim(), effectiveCategory, unit, isIngredient);

      const storeId =
        storePickerValue === ADD_NEW_STORE_VALUE
          ? (await createStore(newStoreText.trim())).id
          : storePickerValue;

      await updateStorePrices(storeId, [{ itemId: item.id, priceAmount: parseFloat(priceText) }]);
      await onAdd(item.id, storeId, parseFloat(quantityText));

      resetForm();
    } catch (err) {
      Alert.alert('Could not add product', 'Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
          <Text style={styles.title}>New product</Text>
          <Text style={styles.subtitle}>
            Not in your catalog yet? Add it here and it'll go straight into your cart.
          </Text>

          {loadingOptions ? (
            <ActivityIndicator size="small" color={neumo.accent} style={styles.loadingIndicator} />
          ) : (
            <>
              <Text style={styles.label}>Name</Text>
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.textInsetWrap}>
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Toothpaste"
                  placeholderTextColor={neumo.textMuted}
                />
              </NeumoInset>

              <Text style={styles.label}>Category</Text>
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.pickerInsetWrap}>
                <Picker
                  selectedValue={categoryPickerValue}
                  onValueChange={(value: string) => {
                    setCategoryPickerValue(value);
                    if (value !== ADD_NEW_CATEGORY_VALUE) setCustomCategoryText('');
                  }}
                  style={styles.picker}
                  mode="dropdown"
                >
                  {categories.map((c) => (
                    <Picker.Item key={c} label={c} value={c} />
                  ))}
                  <Picker.Item label="+ Add new category..." value={ADD_NEW_CATEGORY_VALUE} />
                </Picker>
              </NeumoInset>
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

              <Text style={styles.label}>Unit</Text>
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.pickerInsetWrap}>
                <Picker selectedValue={unit} onValueChange={setUnit} style={styles.picker} mode="dropdown">
                  {UNIT_OPTIONS.map((opt) => (
                    <Picker.Item key={opt} label={opt} value={opt} />
                  ))}
                </Picker>
              </NeumoInset>

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

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Store</Text>
                  <NeumoInset borderRadius={neumo.radiusSm} style={styles.pickerInsetWrap}>
                    <Picker
                      selectedValue={storePickerValue}
                      onValueChange={setStorePickerValue}
                      style={styles.picker}
                      mode="dropdown"
                    >
                      {stores.map((store) => (
                        <Picker.Item key={store.id} label={store.name} value={store.id} />
                      ))}
                      <Picker.Item label="+ Add new store..." value={ADD_NEW_STORE_VALUE} />
                    </Picker>
                  </NeumoInset>
                </View>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Price there</Text>
                  <NeumoInset borderRadius={neumo.radiusSm} style={styles.priceInsetWrap}>
                    <Text style={styles.pesoSign}>₱</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={priceText}
                      onChangeText={(text) => setPriceText(sanitizeDecimalInput(text, 2))}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={neumo.textMuted}
                    />
                  </NeumoInset>
                </View>
              </View>
              {storePickerValue === ADD_NEW_STORE_VALUE && (
                <NeumoInset borderRadius={neumo.radiusSm} style={styles.newValueInsetWrap}>
                  <TextInput
                    style={styles.newValueInput}
                    value={newStoreText}
                    onChangeText={setNewStoreText}
                    placeholder="Type the new store's name"
                    placeholderTextColor={neumo.textMuted}
                    autoFocus
                  />
                </NeumoInset>
              )}

              <Text style={styles.label}>Quantity to add to cart</Text>
              <NeumoInset borderRadius={neumo.radiusSm} style={styles.textInsetWrap}>
                <TextInput
                  style={styles.textInput}
                  value={quantityText}
                  onChangeText={(text) => setQuantityText(sanitizeDecimalInput(text, 2))}
                  keyboardType="decimal-pad"
                />
              </NeumoInset>
            </>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButtonWrap} onPress={handleClose} disabled={isSubmitting}>
              <NeumoInset borderRadius={10} style={styles.cancelButtonInset}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </NeumoInset>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButtonWrap}
              onPress={handleAdd}
              disabled={loadingOptions || isSubmitting}
            >
              <NeumoAccentRaised
                borderRadius={10}
                distance={4}
                fullWidth
                style={[styles.addButtonInner, (loadingOptions || isSubmitting) && styles.addButtonDisabled]}
              >
                <Text style={styles.addButtonText}>{isSubmitting ? 'Adding…' : 'Add to cart'}</Text>
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
    marginBottom: 2,
  },
  subtitle: {
    ...neumoText.caption,
    fontSize: 12,
    marginBottom: 16,
  },
  loadingIndicator: {
    marginVertical: 24,
  },
  label: {
    ...neumoText.caption,
    fontSize: 12,
    marginBottom: 4,
  },
  textInsetWrap: {
    marginBottom: 14,
  },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  pickerInsetWrap: {
    marginBottom: 14,
  },
  picker: {
    color: neumo.textPrimary,
  },
  ingredientToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
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
  newValueInsetWrap: {
    marginTop: -8,
    marginBottom: 14,
  },
  newValueInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowItem: {
    flex: 1,
  },
  priceInsetWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  pesoSign: {
    fontSize: 14,
    color: neumo.textSecondary,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
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
  addButtonWrap: {
    flex: 2,
  },
  addButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.55,
  },
  addButtonText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
});