import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PriceTrendChart from './PriceTrendChart';
import PurchaseFrequencyCard from './PurchaseFrequencyCard';
import { PurchaseReceipt } from '../types';
import { buildPurchasedProductList, buildPriceTrend, buildPurchaseFrequencyStats } from '../utils/insightsLogic';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';

interface ProductInsightsListProps {
  receipts: PurchaseReceipt[];
}

/** VISUAL: outer card is now a full-width raised surface. The expanded PriceTrendChart/PurchaseFrequencyCard below already carry their own neumorphic card look. Logic unchanged. */
export default function ProductInsightsList({ receipts }: ProductInsightsListProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const products = useMemo(() => buildPurchasedProductList(receipts), [receipts]);

  if (products.length === 0) {
    return (
      <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
        <Text style={styles.emptyText}>No purchase history yet - product trends will show up here once you log a trip.</Text>
      </NeumoRaised>
    );
  }

  return (
    <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
      <Text style={styles.title}>Per-product trends &amp; buying habits</Text>
      {products.map((product, idx) => {
        const isExpanded = expandedItemId === product.itemId;
        return (
          <View key={product.itemId} style={[styles.productBlock, idx === 0 && styles.productBlockFirst]}>
            <TouchableOpacity
              style={styles.productHeader}
              activeOpacity={0.6}
              onPress={() => setExpandedItemId(isExpanded ? null : product.itemId)}
            >
              <Text style={styles.productName}>{product.itemName}</Text>
              <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.expandedContent}>
                <PriceTrendChart
                  itemName={product.itemName}
                  points={buildPriceTrend(receipts, product.itemId)}
                />
                <PurchaseFrequencyCard stats={buildPurchaseFrequencyStats(receipts, product.itemId)} />
              </View>
            )}
          </View>
        );
      })}
    </NeumoRaised>
  );
}

const styles = StyleSheet.create({
  cardInner: {
    padding: 14,
    marginBottom: 10,
  },
  title: {
    ...neumoText.subheading,
    fontSize: 13,
    color: neumo.textSecondary,
    marginBottom: 8,
  },
  emptyText: {
    ...neumoText.body,
    fontSize: 12,
    color: neumo.textMuted,
    fontStyle: 'italic',
  },
  productBlock: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
  },
  productBlockFirst: {
    borderTopWidth: 0,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  productName: {
    ...neumoText.body,
    fontSize: 13,
  },
  chevron: {
    fontSize: 10,
    color: neumo.textMuted,
  },
  expandedContent: {
    paddingBottom: 10,
  },
});