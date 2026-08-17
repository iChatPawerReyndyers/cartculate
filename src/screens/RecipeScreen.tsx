import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import RecipeCard from '../components/RecipeCard';
import NewRecipeModal from '../components/NewRecipeModal';
import { fetchRecipes, createRecipe, updateRecipe, deleteRecipe, updateMultiplier, RecipeIngredientInput } from '../api/recipeApi';
import { fetchItems } from '../api/itemApi';
import { fetchStores, Store } from '../api/storeApi';
import { CURRENT_USER_ID } from '../api/config';
import { ApiError } from '../api/httpClient';
import { Item, Recipe } from '../types';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';

interface RecipeScreenProps {
  onCartChanged: () => void;
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * background is the soft blue-gray, "New recipe" is a raised pill, the
 * search bar is an inset field. Horizontal padding tightened from 16 to
 * 12 (header/search/scroll content all match) so cards sit closer to the
 * screen edges - the nested dual-Shadow cards already reserve some blur
 * margin on their own (see RecipeCard.tsx), so less outer padding is
 * needed to avoid the "floating in a sea of margin" look from the first
 * pass. No logic changed in this pass.
 */
export default function RecipeScreen({ onCartChanged }: RecipeScreenProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
  const [updatingMultiplierId, setUpdatingMultiplierId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [recipeData, itemData, storeData] = await Promise.all([
        fetchRecipes(CURRENT_USER_ID),
        fetchItems(),
        fetchStores(),
      ]);
      setRecipes(recipeData);
      setItems(itemData);
      setStores(storeData);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load recipes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredRecipes = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(query));
  }, [recipes, searchText]);

  const handleMultiplierChange = useCallback(
    async (recipe: Recipe, newMultiplier: number) => {
      setUpdatingMultiplierId(recipe.id);
      setRecipes((current) =>
        current.map((r) => (r.id === recipe.id ? { ...r, currentMultiplier: newMultiplier } : r))
      );
      try {
        const updated = await updateMultiplier(CURRENT_USER_ID, recipe.id, newMultiplier);
        setRecipes((current) => current.map((r) => (r.id === recipe.id ? updated : r)));
        onCartChanged();
      } catch (err) {
        Alert.alert('Could not update recipe', 'Please check your connection and try again.');
        loadAll();
      } finally {
        setUpdatingMultiplierId(null);
      }
    },
    [onCartChanged, loadAll]
  );

  const handleEdit = useCallback((recipe: Recipe) => {
    setEditingRecipe(recipe);
    setModalMode('edit');
  }, []);

  const handleDelete = useCallback(
    (recipe: Recipe) => {
      Alert.alert(
        'Delete recipe?',
        `"${recipe.name}" will be removed. Any cart items it added will stay in your cart under "Others" instead of being deleted.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteRecipe(CURRENT_USER_ID, recipe.id);
                setRecipes((current) => current.filter((r) => r.id !== recipe.id));
                onCartChanged();
              } catch (err) {
                Alert.alert('Could not delete recipe', 'Please check your connection and try again.');
              }
            },
          },
        ]
      );
    },
    [onCartChanged]
  );

  const handleSaveModal = useCallback(
    async (name: string, ingredients: RecipeIngredientInput[]) => {
      setIsSavingRecipe(true);
      try {
        if (modalMode === 'edit' && editingRecipe) {
          const updated = await updateRecipe(CURRENT_USER_ID, editingRecipe.id, { name, ingredients });
          setRecipes((current) => current.map((r) => (r.id === editingRecipe.id ? updated : r)));
        } else {
          const created = await createRecipe(CURRENT_USER_ID, { name, ingredients });
          setRecipes((current) => [...current, created]);
        }
        setModalMode(null);
        setEditingRecipe(undefined);
      } catch (err) {
        Alert.alert('Could not save recipe', 'Please check your connection and try again.');
      } finally {
        setIsSavingRecipe(false);
      }
    },
    [modalMode, editingRecipe]
  );

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipes</Text>
        <TouchableOpacity
          onPress={() => {
            setEditingRecipe(undefined);
            setModalMode('add');
          }}
        >
          <NeumoRaised borderRadius={neumo.radiusSm} distance={3} style={styles.newButtonInner}>
            <Text style={styles.newButtonText}>+ New recipe</Text>
          </NeumoRaised>
        </TouchableOpacity>
      </View>

      {!loading && !loadError && (
        <NeumoInset borderRadius={neumo.radiusSm} style={styles.searchInsetWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            placeholderTextColor={neumo.textMuted}
            value={searchText}
            onChangeText={setSearchText}
          />
        </NeumoInset>
      )}

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={neumo.accent} />
        </View>
      ) : loadError ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={loadAll}>
            <NeumoRaised borderRadius={neumo.radiusSm} distance={3} style={styles.retryButtonInner}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </NeumoRaised>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onMultiplierChange={handleMultiplierChange}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isUpdatingMultiplier={updatingMultiplierId === recipe.id}
            />
          ))}
          {filteredRecipes.length === 0 && (
            <Text style={styles.emptyText}>No recipes match "{searchText}".</Text>
          )}
        </ScrollView>
      )}

      <NewRecipeModal
        visible={modalMode !== null}
        mode={modalMode ?? 'add'}
        items={items}
        stores={stores}
        existingRecipe={editingRecipe}
        onCancel={() => {
          setModalMode(null);
          setEditingRecipe(undefined);
        }}
        onSave={handleSaveModal}
        isSaving={isSavingRecipe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: neumo.background,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButtonInner: {
    backgroundColor: neumo.accent,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  title: {
    ...neumoText.heading,
    fontSize: 18,
  },
  newButtonInner: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  newButtonText: {
    ...neumoText.heading,
    fontSize: 13,
  },
  searchInsetWrap: {
    marginHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: neumo.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  emptyText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});