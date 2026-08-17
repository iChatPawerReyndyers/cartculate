import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { fetchPurchases } from '../api/purchaseApi';
import { CURRENT_USER_ID } from '../api/config';
import { ApiError } from '../api/httpClient';
import { formatCurrency } from '../utils/inputSanitization';
import { PurchaseReceipt } from '../types';
import { neumo, neumoText, NeumoRaised, NeumoAccentRaised } from '../utils/neumorphic';

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * each receipt is a full-width raised card, and the Retry button on error
 * is a raised accent pill. Logic unchanged in this pass.
 */
export default function GroceryHistoryScreen() {
  const [receipts, setReceipts] = useState<PurchaseReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPurchases(CURRENT_USER_ID);
      setReceipts(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sortedReceipts = useMemo(
    () => [...receipts].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)),
    [receipts]
  );

  if (loading) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={neumo.accent} />
        </View>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity onPress={loadHistory}>
            <NeumoAccentRaised borderRadius={neumo.radiusSm} distance={4} style={styles.retryButtonInner}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </NeumoAccentRaised>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Grocery History</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sortedReceipts.map((receipt) => {
          const isExpanded = expandedId === receipt.id;
          return (
            <TouchableOpacity
              key={receipt.id}
              activeOpacity={0.7}
              onPress={() => setExpandedId(isExpanded ? null : receipt.id)}
            >
              <NeumoRaised distance={4} fullWidth style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <Text style={styles.storeName}>{receipt.storeName}</Text>
                  <Text style={styles.total}>₱{formatCurrency(receipt.totalReceiptSpent)}</Text>
                </View>
                <Text style={styles.subtitle}>
                  {formatDate(receipt.purchaseDate)} · {receipt.items.length} item
                  {receipt.items.length === 1 ? '' : 's'}
                </Text>

                {isExpanded ? (
                  <View style={styles.itemList}>
                    {receipt.items.map((item, idx) => (
                      <View key={`${item.itemId}-${idx}`} style={styles.itemRow}>
                        <Text style={styles.itemName}>
                          {item.itemName} ×{item.quantity}
                        </Text>
                        <Text style={styles.itemPrice}>
                          ₱{formatCurrency(item.quantity * item.pricePerUnit)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.summaryText} numberOfLines={1}>
                    {receipt.items.map((i) => `${i.itemName} ×${i.quantity}`).join(' · ')}
                  </Text>
                )}
              </NeumoRaised>
            </TouchableOpacity>
          );
        })}

        {sortedReceipts.length === 0 && (
          <Text style={styles.emptyText}>No trips logged yet.</Text>
        )}
      </ScrollView>
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
  cardInner: {
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    ...neumoText.subheading,
    fontSize: 15,
  },
  total: {
    ...neumoText.heading,
    fontSize: 15,
  },
  subtitle: {
    ...neumoText.caption,
    fontSize: 12,
    marginBottom: 8,
  },
  summaryText: {
    ...neumoText.caption,
    fontSize: 12,
    color: neumo.textMuted,
  },
  itemList: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.3)',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemName: {
    ...neumoText.body,
    fontSize: 13,
  },
  itemPrice: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
  },
  emptyText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
});