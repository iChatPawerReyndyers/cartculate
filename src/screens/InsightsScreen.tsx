import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import BudgetProgressCard from '../components/BudgetProgressCard';
import StoreComparisonChart from '../components/StoreComparisonChart';
import CategoryPieChart from '../components/CategoryPieChart';
import MonthlySpendingChart from '../components/MonthlySpendingChart';
import ProductInsightsList from '../components/ProductInsightsList';
import HomeStockSavingsCard from '../components/HomeStockSavingsCard';
import { fetchPurchases } from '../api/purchaseApi';
import { fetchCart } from '../api/cartApi';
import { CURRENT_USER_ID } from '../api/config';
import { ApiError } from '../api/httpClient';
import { MONTHLY_BUDGET_LIMIT } from '../utils/budgetConfig';
import {
  buildBudgetSummary,
  buildStoreSpendingTotals,
  buildCategoryBreakdown,
  buildMonthlyStoreSpending,
} from '../utils/insightsLogic';
import { PurchaseReceipt, CartRow } from '../types';
import { neumo, neumoText, NeumoAccentRaised } from '../utils/neumorphic';

const CURRENT_MONTH_KEY = '2026-07';
const CURRENT_MONTH_LABEL = 'July 2026';

function calculateHomeStockSavings(cartRows: CartRow[]): number {
  return cartRows.reduce((sum, row) => sum + row.overridePantryQty * row.price, 0);
}

/**
 * VISUAL: background switched to the neumorphic soft blue-gray, and the
 * error state's Retry button is now a raised accent pill. Every child
 * card (BudgetProgressCard, HomeStockSavingsCard, the three charts,
 * ProductInsightsList) already carries the neumorphic look internally -
 * no changes needed at this screen's call sites for those. Logic
 * unchanged in this pass.
 */
export default function InsightsScreen() {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [cartRows, setCartRows] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [purchaseData, cartData] = await Promise.all([
        fetchPurchases(CURRENT_USER_ID),
        fetchCart(CURRENT_USER_ID),
      ]);
      setReceipts(purchaseData);
      setCartRows(cartData);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load insights.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const budgetSummary = useMemo(
    () => buildBudgetSummary(receipts, CURRENT_MONTH_KEY, CURRENT_MONTH_LABEL, MONTHLY_BUDGET_LIMIT),
    [receipts]
  );

  const storeTotals = useMemo(() => buildStoreSpendingTotals(receipts), [receipts]);

  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(receipts), [receipts]);

  const monthlyStoreSpending = useMemo(() => buildMonthlyStoreSpending(receipts), [receipts]);

  const homeStockSavings = useMemo(() => calculateHomeStockSavings(cartRows), [cartRows]);

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={neumo.accent} />
        </View>
      ) : loadError ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={loadAll}>
            <NeumoAccentRaised borderRadius={neumo.radiusSm} distance={4} style={styles.retryButtonInner}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </NeumoAccentRaised>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <BudgetProgressCard summary={budgetSummary} />
          <HomeStockSavingsCard totalSaved={homeStockSavings} />
          <MonthlySpendingChart data={monthlyStoreSpending} />
          <StoreComparisonChart totals={storeTotals} />
          <CategoryPieChart breakdown={categoryBreakdown} />
          <ProductInsightsList receipts={receipts} />
        </ScrollView>
      )}
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
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  title: {
    ...neumoText.heading,
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
});