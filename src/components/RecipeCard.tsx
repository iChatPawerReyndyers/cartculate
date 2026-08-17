import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { scaleIngredients, calculatePerBatchCost } from '../utils/recipeLogic';
import { formatQuantityWithUnit, formatCurrency } from '../utils/inputSanitization';
import { Recipe } from '../types';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

const MULTIPLIER_STEP = 0.5;

interface RecipeCardProps {
  recipe: Recipe;
  onMultiplierChange: (recipe: Recipe, newMultiplier: number) => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  isUpdatingMultiplier: boolean;
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx.
 * BUGFIX: outer card now passes `fullWidth` to NeumoRaised - see
 * neumorphic.tsx's file header for why Shadow-based surfaces need this
 * explicitly to stretch instead of shrinking to content width.
 *
 * BUGFIX (previous pass, unchanged here): per-batch/total cost uses
 * calculatePerBatchCost() (unit-aware g->kg / mL->L conversion before
 * pricing) - see recipeLogic.ts.
 */
export default function RecipeCard({
  recipe,
  onMultiplierChange,
  onEdit,
  onDelete,
  isUpdatingMultiplier,
}: RecipeCardProps) {
  const scaledIngredients = useMemo(
    () => scaleIngredients(recipe.ingredients, recipe.currentMultiplier),
    [recipe.ingredients, recipe.currentMultiplier]
  );

  const perBatchCost = useMemo(
    () => calculatePerBatchCost(recipe.ingredients),
    [recipe.ingredients]
  );

  const totalCost = perBatchCost * recipe.currentMultiplier;

  const handleDecrement = () => {
    const next = Math.max(0, recipe.currentMultiplier - MULTIPLIER_STEP);
    onMultiplierChange(recipe, next);
  };

  const handleIncrement = () => {
    onMultiplierChange(recipe, recipe.currentMultiplier + MULTIPLIER_STEP);
  };

  const formattedMultiplier = Number.isInteger(recipe.currentMultiplier)
    ? recipe.currentMultiplier.toString()
    : recipe.currentMultiplier.toFixed(1);

  return (
    <NeumoRaised style={styles.cardInner} distance={4} fullWidth>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{recipe.name}</Text>
        <View style={styles.iconRow}>
          <TouchableOpacity onPress={() => onEdit(recipe)}>
            <NeumoRaised borderRadius={9} distance={2} style={styles.iconButtonInner}>
              <Text style={styles.iconText}>✎</Text>
            </NeumoRaised>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(recipe)}>
            <NeumoRaised borderRadius={9} distance={2} style={styles.iconButtonInner}>
              <Text style={styles.iconTextDanger}>🗑</Text>
            </NeumoRaised>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.ingredientCountText}>
        {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? '' : 's'}
        {recipe.currentMultiplier > 1 ? ` · scaled to ×${formattedMultiplier} batch` : ''}
      </Text>

      <NeumoInset borderRadius={10} style={styles.pricingInset}>
        <Text style={styles.pricingText} numberOfLines={1}>Per batch: ₱{formatCurrency(perBatchCost)}</Text>
        <Text style={styles.pricingText} numberOfLines={1}>Total (×{formattedMultiplier}): ₱{formatCurrency(totalCost)}</Text>
      </NeumoInset>

      <View style={styles.ingredientList}>
        {scaledIngredients.map((ing) => (
          <View key={ing.itemId} style={styles.ingredientRow}>
            <View style={styles.ingredientNameRow}>
              <Text style={styles.ingredientName}>{ing.itemName}</Text>
              {ing.isOptional && (
                <View style={styles.optionalTag}>
                  <Text style={styles.optionalTagText}>optional</Text>
                </View>
              )}
            </View>
            <Text style={styles.ingredientQty}>
              {formatQuantityWithUnit(ing.scaledQuantity, ing.unit)}
            </Text>
          </View>
        ))}
      </View>

      <NeumoInset borderRadius={12} style={styles.multiplierInset}>
        <TouchableOpacity
          onPress={handleDecrement}
          disabled={isUpdatingMultiplier || recipe.currentMultiplier <= 0}
        >
          <NeumoRaised
            borderRadius={9}
            distance={2}
            style={[
              styles.multiplierStepInner,
              recipe.currentMultiplier <= 0 && styles.multiplierStepDisabled,
            ]}
          >
            <Text style={styles.multiplierStepButtonText}>-</Text>
          </NeumoRaised>
        </TouchableOpacity>
        {isUpdatingMultiplier ? (
          <ActivityIndicator size="small" color={neumo.accent} />
        ) : (
          <Text style={styles.multiplierText}>Multiplier: ×{formattedMultiplier}</Text>
        )}
        <TouchableOpacity onPress={handleIncrement} disabled={isUpdatingMultiplier}>
          <NeumoAccentRaised borderRadius={9} distance={2} style={styles.multiplierStepInner}>
            <Text style={styles.multiplierStepButtonTextAccent}>+</Text>
          </NeumoAccentRaised>
        </TouchableOpacity>
      </NeumoInset>
      <Text style={styles.multiplierHint}>
        {recipe.currentMultiplier === 0
          ? '×0 = not in your cart right now'
          : 'Adjusting this updates your cart automatically'}
      </Text>
    </NeumoRaised>
  );
}

const styles = StyleSheet.create({
  cardInner: {
    padding: 14,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ingredientCountText: {
    ...neumoText.caption,
    fontSize: 11,
    color: neumo.textMuted,
    marginBottom: 8,
  },
  title: {
    ...neumoText.heading,
    fontSize: 15,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButtonInner: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 12,
    color: neumo.textSecondary,
  },
  iconTextDanger: {
    fontSize: 12,
    color: neumo.dangerDark,
  },
  pricingInset: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  pricingText: {
    ...neumoText.heading,
    fontSize: 11,
    color: neumo.accentDark,
    flexShrink: 1,
  },
  ingredientList: {
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  ingredientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ingredientName: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
  },
  optionalTag: {
    backgroundColor: '#FFF1E0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  optionalTagText: {
    fontSize: 9,
    color: '#8A5A1E',
    fontWeight: '600',
  },
  ingredientQty: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
  },
  multiplierInset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 8,
  },
  multiplierStepInner: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiplierStepDisabled: {
    opacity: 0.4,
  },
  multiplierStepButtonText: {
    ...neumoText.heading,
    fontSize: 15,
  },
  multiplierStepButtonTextAccent: {
    ...neumoText.heading,
    fontSize: 15,
    color: '#FFFFFF',
  },
  multiplierText: {
    ...neumoText.heading,
    fontSize: 14,
    minWidth: 100,
    textAlign: 'center',
  },
  multiplierHint: {
    ...neumoText.caption,
    fontSize: 10,
    color: neumo.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
});