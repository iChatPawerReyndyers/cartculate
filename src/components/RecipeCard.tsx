import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { scaleIngredients } from '../utils/recipeLogic';
import { Recipe, ScaleFactor } from '../types';

const SCALE_OPTIONS: ScaleFactor[] = [0.5, 1, 2];

interface RecipeCardProps {
  recipe: Recipe;
  onAddToCart: (recipe: Recipe, scaleFactor: number) => void;
}

export default function RecipeCard({ recipe, onAddToCart }: RecipeCardProps) {
  const [scaleFactor, setScaleFactor] = useState<ScaleFactor>(1);

  const scaledIngredients = useMemo(
    () => scaleIngredients(recipe.ingredients, scaleFactor),
    [recipe.ingredients, scaleFactor]
  );

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{recipe.name}</Text>
        <View style={styles.scalePicker}>
          <Text style={styles.scaleLabel}>Scale</Text>
          <Picker
            selectedValue={scaleFactor}
            onValueChange={(value: ScaleFactor) => setScaleFactor(value)}
            style={styles.picker}
            mode="dropdown"
          >
            {SCALE_OPTIONS.map((factor) => (
              <Picker.Item key={factor} label={`x${factor}`} value={factor} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.ingredientList}>
        {scaledIngredients.map((ing) => (
          <View key={ing.itemId} style={styles.ingredientRow}>
            <Text style={styles.ingredientName}>{ing.itemName}</Text>
            <Text style={styles.ingredientQty}>
              {ing.scaledQuantity}
              {ing.unit || ''}
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => onAddToCart(recipe, scaleFactor)}
      >
        <Text style={styles.addButtonText}>Add to cart</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E0E0E0',
    padding: 14,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  scalePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scaleLabel: {
    fontSize: 12,
    color: '#757575',
  },
  picker: {
    width: 90,
    height: 36,
  },
  ingredientList: {
    marginBottom: 10,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  ingredientName: {
    fontSize: 13,
    color: '#757575',
  },
  ingredientQty: {
    fontSize: 13,
    color: '#757575',
  },
  addButton: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
  },
});