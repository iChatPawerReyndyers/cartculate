import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import RecipeCard from '../components/RecipeCard';
import { mockRecipes } from '../data/mockRecipeData';
import { buildCartRowsFromRecipe, mergeCartRows } from '../utils/recipeLogic';
import { CartRow, Recipe } from '../types';

interface RecipeScreenProps {
  cartRows: CartRow[];
  setCartRows: React.Dispatch<React.SetStateAction<CartRow[]>>;
  onNavigateToCart?: () => void;
}

export default function RecipeScreen({ cartRows, setCartRows, onNavigateToCart }: RecipeScreenProps) {
  // TODO: replace mockRecipes with a real fetch from
  // GET /api/users/{userId}/recipes once the Spring Boot endpoint exists.
  const [recipes] = useState<Recipe[]>(mockRecipes);

  const handleAddToCart = useCallback(
    (recipe: Recipe, scaleFactor: number) => {
      const newRows = buildCartRowsFromRecipe(recipe, scaleFactor);
      setCartRows((existing) => mergeCartRows(existing, newRows));
      if (onNavigateToCart) onNavigateToCart();
    },
    [setCartRows, onNavigateToCart]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Recipes</Text>
        <TouchableOpacity style={styles.newButton}>
          <Text style={styles.newButtonText}>+ New recipe</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onAddToCart={handleAddToCart}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  newButton: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  newButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});