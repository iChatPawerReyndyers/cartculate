import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Store } from '../api/storeApi';
import { CategoryDefaultStore } from '../types';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

const NONE_LABEL = 'None set';

interface CategoryDefaultStoresCardProps {
  categories: string[];
  stores: Store[];
  categoryDefaultStores: CategoryDefaultStore[];
  onChange: (category: string, storeId: string | null) => void;
}

/**
 * Feature: "Default store per category" (Price Catalog tab). See the
 * original doc comment below for the full feature rationale - unchanged.
 *
 * VISUAL: summary card and every row now use the neumorphic system - the
 * summary card is a raised full-width surface, the "value chip" per
 * category is an inset well (accent-tinted once a default is set), and
 * the add-category form's input/buttons follow the same
 * inset/raised/accent-raised split used everywhere else. No logic changed.
 */
export default function CategoryDefaultStoresCard({
  categories,
  stores,
  categoryDefaultStores,
  onChange,
}: CategoryDefaultStoresCardProps) {
  const insets = useSafeAreaInsets();
  const [managerOpen, setManagerOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryText, setNewCategoryText] = useState('');

  const configuredCount = categoryDefaultStores.length;

  const labelFor = (category: string) =>
    categoryDefaultStores.find((c) => c.category === category)?.storeName ?? NONE_LABEL;

  const handleSelectStore = (storeId: string | null) => {
    if (pickerCategory) onChange(pickerCategory, storeId);
    setPickerCategory(null);
  };

  const handleStartAddCategory = () => {
    setNewCategoryText('');
    setAddingCategory(true);
  };

  const handleSubmitNewCategory = () => {
    const trimmed = newCategoryText.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Type a category name first.');
      return;
    }
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Already exists', 'That category is already in the list below.');
      return;
    }
    setAddingCategory(false);
    setPickerCategory(trimmed);
  };

  return (
    <>
      <TouchableOpacity onPress={() => setManagerOpen(true)} activeOpacity={0.8}>
        <NeumoRaised borderRadius={14} distance={4} style={styles.cardInner} fullWidth>
          <View style={styles.cardTextWrap}>
            <Text style={styles.title}>Default store by category</Text>
            <Text style={styles.subtitle}>
              {configuredCount} of {categories.length} categories configured
            </Text>
          </View>
          <Text style={styles.manageLink}>Manage ›</Text>
        </NeumoRaised>
      </TouchableOpacity>

      <Modal
        visible={managerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setManagerOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: 20 + insets.bottom }]}>
            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Category default stores</Text>
              <TouchableOpacity onPress={() => setManagerOpen(false)}>
                <Text style={styles.doneLink}>Done</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSubtitle}>
              New products in a category start routed to its default store. Overriding a single
              product is still done from that product's own edit form.
            </Text>

            <NeumoInset borderRadius={14} style={styles.listInset}>
              <ScrollView>
                {categories.map((category) => {
                  const label = labelFor(category);
                  const isSet = label !== NONE_LABEL;
                  return (
                    <View key={category} style={styles.row}>
                      <Text style={styles.categoryText} numberOfLines={1}>
                        {category}
                      </Text>
                      <TouchableOpacity onPress={() => setPickerCategory(category)} activeOpacity={0.7}>
                        <View style={[styles.valueChip, isSet && styles.valueChipSet]}>
                          <Text style={[styles.valueChipText, isSet && styles.valueChipTextSet]} numberOfLines={1}>
                            {label}
                          </Text>
                          <Text style={styles.chevron}>▾</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
                {categories.length === 0 && (
                  <Text style={styles.emptyText}>No categories yet.</Text>
                )}

                {addingCategory ? (
                  <View style={styles.addCategoryForm}>
                    <NeumoInset borderRadius={neumo.radiusSm} style={styles.addCategoryInputWrap}>
                      <TextInput
                        style={styles.addCategoryInput}
                        value={newCategoryText}
                        onChangeText={setNewCategoryText}
                        placeholder="New category name"
                        placeholderTextColor={neumo.textMuted}
                        autoFocus
                      />
                    </NeumoInset>
                    <View style={styles.addCategoryButtonRow}>
                      <TouchableOpacity style={styles.addCategoryCancelWrap} onPress={() => setAddingCategory(false)}>
                        <NeumoInset borderRadius={neumo.radiusSm} style={styles.addCategoryCancelInset}>
                          <Text style={styles.addCategoryCancelText}>Cancel</Text>
                        </NeumoInset>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.addCategoryNextWrap} onPress={handleSubmitNewCategory}>
                        <NeumoAccentRaised borderRadius={neumo.radiusSm} distance={3} fullWidth style={styles.addCategoryNextInner}>
                          <Text style={styles.addCategoryNextText}>Next: pick store</Text>
                        </NeumoAccentRaised>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity onPress={handleStartAddCategory}>
                    <View style={styles.addCategoryButton}>
                      <Text style={styles.addCategoryButtonText}>+ Add new category</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </NeumoInset>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pickerCategory !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPickerCategory(null)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerCategory(null)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.pickerSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.pickerTitle}>{pickerCategory}</Text>
            <Text style={styles.pickerSubtitle}>Default store</Text>

            <TouchableOpacity style={styles.optionRow} onPress={() => handleSelectStore(null)}>
              <Text style={styles.optionText}>None set</Text>
            </TouchableOpacity>
            {stores.map((store) => (
              <TouchableOpacity key={store.id} style={styles.optionRow} onPress={() => handleSelectStore(store.id)}>
                <Text style={styles.optionText}>{store.name}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginHorizontal: 12,
    marginTop: 12,
  },
  cardTextWrap: {
    flexShrink: 1,
  },
  title: {
    ...neumoText.subheading,
    fontSize: 13,
  },
  subtitle: {
    ...neumoText.caption,
    fontSize: 11,
    marginTop: 2,
  },
  manageLink: {
    ...neumoText.heading,
    fontSize: 12,
    color: neumo.accentDark,
  },
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
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitle: {
    ...neumoText.heading,
    fontSize: 18,
  },
  doneLink: {
    ...neumoText.heading,
    fontSize: 14,
    color: neumo.accentDark,
  },
  sheetSubtitle: {
    ...neumoText.caption,
    fontSize: 12,
    marginBottom: 12,
  },
  listInset: {
    paddingHorizontal: 14,
    maxHeight: 420,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
    paddingVertical: 10,
    gap: 8,
  },
  categoryText: {
    ...neumoText.body,
    fontSize: 13,
    flex: 1,
  },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: neumo.surfaceInset,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    maxWidth: 160,
    borderWidth: 1,
    borderColor: 'rgba(166,176,195,0.4)',
  },
  valueChipSet: {
    backgroundColor: '#E3F7EC',
    borderColor: neumo.accent,
  },
  valueChipText: {
    ...neumoText.subheading,
    fontSize: 12,
    color: neumo.textMuted,
    flexShrink: 1,
  },
  valueChipTextSet: {
    color: neumo.accentDark,
  },
  chevron: {
    fontSize: 10,
    color: neumo.textMuted,
  },
  emptyText: {
    ...neumoText.caption,
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  addCategoryButton: {
    borderWidth: 1,
    borderColor: neumo.shadowDark,
    borderStyle: 'dashed',
    borderRadius: neumo.radiusSm,
    paddingVertical: 10,
    alignItems: 'center',
    marginVertical: 10,
  },
  addCategoryButtonText: {
    ...neumoText.subheading,
    fontSize: 13,
  },
  addCategoryForm: {
    marginVertical: 10,
  },
  addCategoryInputWrap: {
    marginBottom: 8,
  },
  addCategoryInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  addCategoryButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addCategoryCancelWrap: {
    flex: 1,
  },
  addCategoryCancelInset: {
    paddingVertical: 9,
    alignItems: 'center',
  },
  addCategoryCancelText: {
    ...neumoText.heading,
    fontSize: 13,
  },
  addCategoryNextWrap: {
    flex: 2,
  },
  addCategoryNextInner: {
    paddingVertical: 9,
    alignItems: 'center',
  },
  addCategoryNextText: {
    ...neumoText.heading,
    fontSize: 13,
    color: '#FFFFFF',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(58,67,88,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerSheet: {
    backgroundColor: neumo.background,
    borderRadius: 18,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
  },
  pickerTitle: {
    ...neumoText.heading,
    fontSize: 15,
    marginBottom: 2,
  },
  pickerSubtitle: {
    ...neumoText.caption,
    fontSize: 12,
    marginBottom: 10,
  },
  optionRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
  },
  optionText: {
    ...neumoText.body,
    fontSize: 14,
  },
});