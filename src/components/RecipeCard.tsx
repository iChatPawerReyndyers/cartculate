import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, PixelRatio } from 'react-native';
import { scaleIngredients, calculatePerBatchCost } from '../utils/recipeLogic';
import { formatQuantityWithUnit, formatCurrency } from '../utils/inputSanitization';
import { Recipe } from '../types';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';
import HorizontalWheelPicker from './HorizontalWheelPicker';

/**
 * Multiplier range/step for the swipe wheel below. Fixed 0-5 range (21
 * ticks at 0.25 apart): the wheel needs a known range to lay out and
 * center its ticks. 5x covers any realistic batch multiple (party-sized
 * cooking etc.) - flag it if you actually need higher.
 */
const MULTIPLIER_STEP = 0.25;
const MULTIPLIER_MIN = 0;
const MULTIPLIER_MAX = 5;

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

  const formattedMultiplier = Number.isInteger(recipe.currentMultiplier)
    ? recipe.currentMultiplier.toString()
    : recipe.currentMultiplier.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');

  return (
    <NeumoRaised style={styles.cardInner} fullWidth>
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
            <View style={styles.ingredientQtyRow}>
              {recipe.currentMultiplier === 1 ? (
                <Text style={[styles.ingredientQtyScaled, styles.qtyColumnSingle]} numberOfLines={1}>
                  {formatQuantityWithUnit(ing.scaledQuantity, ing.unit)}
                </Text>
              ) : (
                <>
                  <Text style={[styles.ingredientQty, styles.qtyColumnBase]} numberOfLines={1}>
                    {formatQuantityWithUnit(ing.baseQuantity, ing.unit)}
                  </Text>
                  <Text style={styles.ingredientQtyArrow}>→</Text>
                  <Text style={[styles.ingredientQtyScaled, styles.qtyColumnScaled]} numberOfLines={1}>
                    {formatQuantityWithUnit(ing.scaledQuantity, ing.unit)}
                  </Text>
                </>
              )}
            </View>
          </View>
        ))}
      </View>

      <NeumoInset borderRadius={12} style={styles.multiplierInset}>
        <View style={styles.multiplierRow}>
          <Text style={styles.multiplierLabel}>Multiplier</Text>
          <View style={styles.multiplierWheelWrap}>
            {isUpdatingMultiplier ? (
              <ActivityIndicator size="small" color={neumo.accent} style={styles.multiplierSpinner} />
            ) : (
              <HorizontalWheelPicker
                value={recipe.currentMultiplier}
                min={MULTIPLIER_MIN}
                max={MULTIPLIER_MAX}
                step={MULTIPLIER_STEP}
                onChange={(next) => onMultiplierChange(recipe, next)}
                formatLabel={(v) => `×${Number.isInteger(v) ? v : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`}
              />
            )}
          </View>
        </View>
      </NeumoInset>
      <Text style={styles.multiplierHint}>
        {recipe.currentMultiplier === 0
          ? '×0 = not in your cart right now'
          : 'Swipe to scale this recipe - updates your cart automatically'}
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
  ingredientQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientQty: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
  },
  ingredientQtyArrow: {
    fontSize: 11,
    color: neumo.textMuted,
    width: 18,
    textAlign: 'center',
  },
  ingredientQtyScaled: {
    ...neumoText.heading,
    fontSize: 13,
    color: neumo.accentDark,
  },
  qtyColumnBase: {
    width: 60,
    textAlign: 'right',
  },
  qtyColumnScaled: {
    width: 60,
    textAlign: 'left',
  },
  qtyColumnSingle: {
    minWidth: 60,
    textAlign: 'right',
  },
  multiplierInset: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  multiplierLabel: {
    ...neumoText.caption,
    fontSize: 10,
    color: neumo.textMuted,
  },
  multiplierWheelWrap: {
    flex: 1,
    borderLeftWidth: 1.5 / PixelRatio.get(),
    borderLeftColor: 'rgba(120,129,150,0.35)',
    paddingLeft: 10,
  },
  multiplierSpinner: {
    height: 36,
  },
  multiplierHint: {
    ...neumoText.caption,
    fontSize: 10,
    color: neumo.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});