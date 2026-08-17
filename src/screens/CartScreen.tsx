import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Vibration,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
} from 'react-native';
import StoreSection from '../components/StoreSection';
import CategorySection from '../components/CategorySection';
import CartExcludedSection from '../components/CartExcludedSection';
import CartItem from '../components/CartItem';
import ReconciliationModal from '../components/ReconciliationModal';
import AddItemModal from '../components/AddItemModal';
import MasterResetModal from '../components/MasterResetModal';
import { consolidateCart, groupByStatus, groupByCategory, calculateGrandTotal, buildMissingCatalogItems, CatalogItemWithPrice } from '../utils/cartLogic';
import { fetchUserMode, updateUserMode } from '../api/userApi';
import { fetchItems } from '../api/itemApi';
import { fetchAllStorePrices } from '../api/storePriceApi';
import { CURRENT_USER_ID } from '../api/config';
import { MONTHLY_BUDGET_LIMIT } from '../utils/budgetConfig';
import { CartRow, ManifestItem, StoreGroup, UserMode } from '../types';
import { formatCurrency } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset } from '../utils/neumorphic';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ViewMode = 'store' | 'status' | 'category';

interface CartScreenProps {
  cartRows: CartRow[];
  onIncrement: (itemId: string, storeId: string) => void;
  onDecrement: (itemId: string, storeId: string) => void;
  onPantryAdjust: (rowId: string, delta: number) => void;
  onSetPantryReason: (rowId: string, reason: string | null) => void;
  onPantryTreasureFound: (rowId: string, reason: string) => void;
  onToggleChecked: (rowId: string, checked: boolean) => void;
  onMasterReset: () => void;
  onCompleteTrip: (storeId: string, actualTotal: number, manifest: ManifestItem[]) => Promise<boolean>;
  onAddItem: (itemId: string, storeId: string, quantity: number) => Promise<void>;
  onNavigateToScanner?: () => void;
}

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx.
 * BUGFIX: the active Home/Away pill now passes `fullWidth` to NeumoRaised
 * - it lives inside a flex:1 half-width slot (modeButtonWrap) meant to
 * fill half the segmented toggle, but Shadow-based surfaces don't stretch
 * to fill a flex parent by default (see neumorphic.tsx's file header), so
 * it was previously sizing to just its text content instead. No other
 * changes in this pass.
 */
export default function CartScreen({
  cartRows,
  onIncrement,
  onDecrement,
  onPantryAdjust,
  onSetPantryReason,
  onPantryTreasureFound,
  onToggleChecked,
  onMasterReset,
  onCompleteTrip,
  onAddItem,
  onNavigateToScanner,
}: CartScreenProps) {
  const [mode, setMode] = useState<UserMode>('HOME');
  const [modeLoading, setModeLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('store');
  const [reconcilingStore, setReconcilingStore] = useState<StoreGroup | null>(null);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [startedStoreIds, setStartedStoreIds] = useState<Set<string>>(new Set());
  const [catalogEntries, setCatalogEntries] = useState<CatalogItemWithPrice[]>([]);

  useEffect(() => {
    Promise.all([fetchItems(), fetchAllStorePrices()])
      .then(([items, prices]) => {
        const itemsById = new Map(items.map((i) => [i.id, i]));
        const entries: CatalogItemWithPrice[] = prices.map((p) => ({
          itemId: p.itemId,
          itemName: p.itemName,
          category: itemsById.get(p.itemId)?.category ?? '',
          unit: itemsById.get(p.itemId)?.unit ?? null,
          storeId: p.storeId,
          storeName: p.storeName,
          price: p.priceAmount,
        }));
        setCatalogEntries(entries);
      })
      .catch(() => {
        /* non-critical - Excluded sections just won't show not-yet-added catalog items if this fails */
      });
  }, []);

  useEffect(() => {
    fetchUserMode(CURRENT_USER_ID)
      .then(setMode)
      .catch(() => {
        /* fall back to HOME (already the default state) if this fails - non-critical */
      })
      .finally(() => setModeLoading(false));
  }, []);

  const handleModeChange = useCallback(async (newMode: UserMode) => {
    const previousMode = mode;
    setMode(newMode); // optimistic
    try {
      await updateUserMode(CURRENT_USER_ID, newMode);
    } catch (err) {
      Alert.alert('Could not switch mode', 'Please check your connection and try again.');
      setMode(previousMode); // roll back
    }
  }, [mode]);

  const handleMasterResetLongPress = useCallback(() => {
    try {
      Vibration.vibrate(80);
    } catch (err) {
      // Intentionally ignored - some devices/permission states throw here.
    }
    setShowResetConfirm(true);
  }, []);

  const handleConfirmReset = useCallback(() => {
    setShowResetConfirm(false);
    setStartedStoreIds(new Set());
    onMasterReset();
  }, [onMasterReset]);

  const handleToggleCheckedAnimated = useCallback(
    (rowId: string, checked: boolean) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onToggleChecked(rowId, checked);
    },
    [onToggleChecked]
  );

  const { stores, excludedItems } = useMemo(() => consolidateCart(cartRows), [cartRows]);
  const { itemsToBuy, stillAtHome, excluded } = useMemo(() => groupByStatus(cartRows), [cartRows]);
  const categoryGroups = useMemo(() => groupByCategory(cartRows), [cartRows]);

  const missingCatalogItems = useMemo(
    () => (mode === 'HOME' ? buildMissingCatalogItems(cartRows, catalogEntries) : []),
    [mode, cartRows, catalogEntries]
  );
  const excludedItemsWithCatalog = useMemo(
    () => [...excludedItems, ...missingCatalogItems],
    [excludedItems, missingCatalogItems]
  );
  const excludedWithCatalog = useMemo(
    () => [...excluded, ...missingCatalogItems],
    [excluded, missingCatalogItems]
  );

  const handleToggleStartGrocery = useCallback(
    (storeId: string) => {
      setStartedStoreIds((current) => {
        if (current.has(storeId)) {
          const store = stores.find((s) => s.storeId === storeId);
          if (store) setReconcilingStore(store);
          return current;
        }
        const next = new Set(current);
        next.add(storeId);
        return next;
      });
    },
    [stores]
  );

  const handleConfirmTrip = useCallback(
    async (actualTotal: number, adjustedManifest: ManifestItem[]) => {
      if (!reconcilingStore) return;

      setIsSubmittingTrip(true);
      const success = await onCompleteTrip(reconcilingStore.storeId, actualTotal, adjustedManifest);
      setIsSubmittingTrip(false);

      if (success) {
        setStartedStoreIds((current) => {
          const next = new Set(current);
          next.delete(reconcilingStore.storeId);
          return next;
        });
        setReconcilingStore(null);
      }
    },
    [reconcilingStore, onCompleteTrip]
  );

  const grandTotal = useMemo(
    () => calculateGrandTotal([...itemsToBuy, ...stillAtHome]),
    [itemsToBuy, stillAtHome]
  );

  const snackFund = MONTHLY_BUDGET_LIMIT - grandTotal;

  const reconcilingCheckedItems = reconcilingStore
    ? reconcilingStore.items.filter((item) => item.isCheckedCheckout)
    : [];

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cartculate</Text>
          <Text style={styles.tagline}>Smart shopping. Playful cooking.</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowAddItemModal(true)}>
            <NeumoInset borderRadius={neumo.radiusSm} style={styles.addItemInset}>
              <Text style={styles.addItemButtonText}>+ New product</Text>
            </NeumoInset>
          </TouchableOpacity>
          <NeumoInset borderRadius={neumo.radiusSm} style={styles.totalInset}>
            <Text style={styles.totalText}>Total ₱{formatCurrency(grandTotal)}</Text>
          </NeumoInset>
          <Pressable onLongPress={handleMasterResetLongPress} delayLongPress={2000}>
            <View style={styles.masterResetButton}>
              <Text style={styles.masterResetButtonText}>Hold to Reset</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.budgetRow}>
        <Text style={[styles.snackFundText, snackFund < 0 && styles.snackFundTextNegative]}>
          🍪 Snack fund: {snackFund >= 0 ? '+' : '-'}₱{formatCurrency(Math.abs(snackFund))} left this month
        </Text>
      </View>

      {modeLoading ? (
        <ActivityIndicator size="small" color={neumo.accent} style={styles.modeLoadingIndicator} />
      ) : (
        <View style={styles.toggleRow}>
          <NeumoInset borderRadius={14} style={styles.modeToggleInset}>
            <TouchableOpacity style={styles.modeButtonWrap} onPress={() => handleModeChange('HOME')}>
              {mode === 'HOME' ? (
                <NeumoRaised borderRadius={11} distance={3} style={styles.modeButtonRaised} fullWidth>
                  <Text style={styles.modeButtonTextActive}>🏠 Home Mode</Text>
                </NeumoRaised>
              ) : (
                <View style={styles.modeButtonFlat}>
                  <Text style={styles.modeButtonText}>🏠 Home Mode</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modeButtonWrap} onPress={() => handleModeChange('AWAY')}>
              {mode === 'AWAY' ? (
                <NeumoRaised borderRadius={11} distance={3} style={styles.modeButtonRaised} fullWidth>
                  <Text style={styles.modeButtonTextActive}>🛒 Away Mode</Text>
                </NeumoRaised>
              ) : (
                <View style={styles.modeButtonFlat}>
                  <Text style={styles.modeButtonText}>🛒 Away Mode</Text>
                </View>
              )}
            </TouchableOpacity>
          </NeumoInset>

          {mode === 'HOME' && (
            <NeumoInset borderRadius={11} style={styles.viewToggleInset}>
              {(['store', 'status', 'category'] as ViewMode[]).map((vm) => {
                const label = vm === 'store' ? 'By Store' : vm === 'status' ? 'By Status' : 'By Category';
                const active = viewMode === vm;
                return (
                  <TouchableOpacity key={vm} onPress={() => setViewMode(vm)}>
                    {active ? (
                      <NeumoRaised borderRadius={9} distance={2} style={styles.viewButtonRaised}>
                        <Text style={styles.viewButtonTextActive}>{label}</Text>
                      </NeumoRaised>
                    ) : (
                      <View style={styles.viewButtonFlat}>
                        <Text style={styles.viewButtonText}>{label}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </NeumoInset>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {(mode === 'AWAY' || viewMode === 'store') && (
          <>
            {stores.map((store) => {
              const isStarted = mode === 'AWAY' && startedStoreIds.has(store.storeId);
              const sectionItemMode: UserMode = isStarted ? 'AWAY' : 'HOME';
              const checkedCount = store.items.filter((item) => item.isCheckedCheckout).length;
              return (
                <StoreSection
                  key={store.storeId}
                  store={store}
                  itemMode={sectionItemMode}
                  showGroceryButton={mode === 'AWAY'}
                  isStarted={isStarted}
                  checkedCount={checkedCount}
                  onToggleStart={() => handleToggleStartGrocery(store.storeId)}
                  onIncrement={onIncrement}
                  onDecrement={onDecrement}
                  onPantryAdjust={onPantryAdjust}
                  onSetPantryReason={onSetPantryReason}
                  onPantryTreasureFound={onPantryTreasureFound}
                  onToggleChecked={handleToggleCheckedAnimated}
                />
              );
            })}

            {mode === 'HOME' && (
              <CartExcludedSection
                excludedItems={excludedItemsWithCatalog}
                mode={mode}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onPantryAdjust={onPantryAdjust}
                onSetPantryReason={onSetPantryReason}
                onPantryTreasureFound={onPantryTreasureFound}
                onToggleChecked={handleToggleCheckedAnimated}
              />
            )}
          </>
        )}

        {mode === 'HOME' && viewMode === 'status' && (
          <>
            <Text style={[styles.statusSectionTitle, styles.statusSectionTitleBuy]}>🛒 Items to Buy</Text>
            {itemsToBuy.map((item) => (
              <CartItem
                key={`${item.itemId}-${item.storeId}`}
                item={item}
                mode={mode}
                showStoreName
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onPantryAdjust={onPantryAdjust}
                onSetPantryReason={onSetPantryReason}
                onPantryTreasureFound={onPantryTreasureFound}
                onToggleChecked={handleToggleCheckedAnimated}
              />
            ))}
            {itemsToBuy.length === 0 && (
              <Text style={styles.statusEmptyText}>Nothing left to buy.</Text>
            )}

            <Text style={styles.statusSectionTitle}>🏠 Still Available at Home</Text>
            {stillAtHome.map((item) => (
              <CartItem
                key={`${item.itemId}-${item.storeId}`}
                item={item}
                mode={mode}
                showStoreName
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onPantryAdjust={onPantryAdjust}
                onSetPantryReason={onSetPantryReason}
                onPantryTreasureFound={onPantryTreasureFound}
                onToggleChecked={handleToggleCheckedAnimated}
              />
            ))}
            {stillAtHome.length === 0 && (
              <Text style={styles.statusEmptyText}>Nothing fully covered by pantry stock yet.</Text>
            )}

            <Text style={[styles.statusSectionTitle, styles.statusSectionTitleMuted]}>Excluded Items</Text>
            {excludedWithCatalog.map((item) => (
              <CartItem
                key={`${item.itemId}-${item.storeId}`}
                item={item}
                mode={mode}
                showStoreName
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onPantryAdjust={onPantryAdjust}
                onSetPantryReason={onSetPantryReason}
                onPantryTreasureFound={onPantryTreasureFound}
                onToggleChecked={handleToggleCheckedAnimated}
              />
            ))}
            {excludedWithCatalog.length === 0 && (
              <Text style={styles.statusEmptyText}>No excluded items.</Text>
            )}
          </>
        )}

        {mode === 'HOME' && viewMode === 'category' && (
          <>
            {categoryGroups.map((group) => (
              <CategorySection
                key={group.category}
                category={group.category}
                items={group.items}
                mode={mode}
                onIncrement={onIncrement}
                onDecrement={onDecrement}
                onPantryAdjust={onPantryAdjust}
                onSetPantryReason={onSetPantryReason}
                onPantryTreasureFound={onPantryTreasureFound}
                onToggleChecked={handleToggleCheckedAnimated}
              />
            ))}
            {categoryGroups.length === 0 && (
              <Text style={styles.statusEmptyText}>Nothing in your cart yet.</Text>
            )}

            <CartExcludedSection
              excludedItems={excludedItemsWithCatalog}
              mode={mode}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onPantryAdjust={onPantryAdjust}
              onSetPantryReason={onSetPantryReason}
              onPantryTreasureFound={onPantryTreasureFound}
              onToggleChecked={handleToggleCheckedAnimated}
            />
          </>
        )}
      </ScrollView>

      <ReconciliationModal
        visible={reconcilingStore !== null}
        storeName={reconcilingStore?.storeName ?? ''}
        checkedItems={reconcilingCheckedItems}
        onCancel={() => setReconcilingStore(null)}
        onConfirm={handleConfirmTrip}
        isSubmitting={isSubmittingTrip}
        onScanInstead={onNavigateToScanner}
      />

      <AddItemModal
        visible={showAddItemModal}
        onCancel={() => setShowAddItemModal(false)}
        onAdd={async (itemId, storeId, quantity) => {
          await onAddItem(itemId, storeId, quantity);
          setShowAddItemModal(false);
        }}
      />

      <MasterResetModal
        visible={showResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={handleConfirmReset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: neumo.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addItemInset: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  addItemButtonText: {
    ...neumoText.subheading,
    fontSize: 12,
  },
  title: {
    ...neumoText.heading,
    fontSize: 18,
  },
  tagline: {
    fontSize: 10,
    fontStyle: 'italic',
    color: neumo.accentDark,
    marginTop: 1,
  },
  totalInset: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalText: {
    ...neumoText.heading,
    fontSize: 13,
    color: neumo.accentDark,
  },
  masterResetButton: {
    backgroundColor: neumo.danger,
    borderRadius: neumo.radiusSm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  masterResetButtonText: {
    ...neumoText.heading,
    fontSize: 11,
    color: '#FFFFFF',
  },
  budgetRow: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  snackFundText: {
    ...neumoText.subheading,
    fontSize: 12,
    color: '#3B6D11',
  },
  snackFundTextNegative: {
    color: '#C0392B',
  },
  modeLoadingIndicator: {
    marginVertical: 8,
  },
  toggleRow: {
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  modeToggleInset: {
    flexDirection: 'row',
    padding: 3,
  },
  modeButtonWrap: {
    flex: 1,
  },
  modeButtonRaised: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modeButtonFlat: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 11,
  },
  modeButtonText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
  },
  modeButtonTextActive: {
    ...neumoText.heading,
    fontSize: 13,
    color: neumo.accentDark,
  },
  viewToggleInset: {
    flexDirection: 'row',
    padding: 2,
    alignSelf: 'flex-start',
  },
  viewButtonRaised: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  viewButtonFlat: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  viewButtonText: {
    ...neumoText.body,
    fontSize: 12,
    color: neumo.textSecondary,
  },
  viewButtonTextActive: {
    ...neumoText.heading,
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  statusSectionTitle: {
    ...neumoText.heading,
    fontSize: 13,
    color: neumo.textSecondary,
    marginTop: 14,
    marginBottom: 8,
  },
  statusSectionTitleBuy: {
    color: neumo.accentDark,
  },
  statusSectionTitleMuted: {
    color: neumo.textMuted,
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(166,176,195,0.35)',
  },
  statusEmptyText: {
    ...neumoText.body,
    fontSize: 12,
    color: neumo.textMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
});