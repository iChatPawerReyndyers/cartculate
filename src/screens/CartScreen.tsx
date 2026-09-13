import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Vibration,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import StoreSection from '../components/StoreSection';
import CategorySection from '../components/CategorySection';
import CartExcludedSection from '../components/CartExcludedSection';
import CartItem from '../components/CartItem';
import ReconciliationModal from '../components/ReconciliationModal';
import MasterResetModal from '../components/MasterResetModal';
import MoveToStoreModal from '../components/MoveToStoreModal';
import EditPriceModal from '../components/EditPriceModal';
import { consolidateCart, groupByStatus, groupByCategory, calculateGrandTotal, buildMissingCatalogItems, CatalogItemWithPrice } from '../utils/cartLogic';
import { fetchUserMode, updateUserMode } from '../api/userApi';
import { fetchItems } from '../api/itemApi';
import { fetchAllStorePrices } from '../api/storePriceApi';
import { fetchStores, Store } from '../api/storeApi';
import { moveCartItem } from '../api/cartApi';
import { CURRENT_USER_ID } from '../api/config';
import { CartRow, ManifestItem, StoreGroup, UserMode, ConsolidatedItem } from '../types';
import { formatCurrency } from '../utils/inputSanitization';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

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
  /**
   * Kept in the prop contract (App.tsx still wires handleAddItem in) even
   * though the Cart tab's own "+ New product" entry point was removed per
   * request - adding new products now happens from the Pricing tab's
   * "+ Add product" instead (see PriceCatalogView.tsx). Left here rather
   * than ripping the prop out of App.tsx too, in case a different entry
   * point wants it back later.
   */
  onAddItem: (itemId: string, storeId: string, quantity: number) => Promise<void>;
  onNavigateToScanner?: () => void;
  onMoveItem: (itemId: string, fromStoreId: string, toStoreId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onUpdatePrice: (itemId: string, storeId: string, price: number) => Promise<void>;
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
  onMoveItem,
  onRefresh,
  onUpdatePrice,
}: CartScreenProps) {
  const [mode, setMode] = useState<UserMode>('HOME');
  const [modeLoading, setModeLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('store');
  const [reconcilingStore, setReconcilingStore] = useState<StoreGroup | null>(null);
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [startedStoreIds, setStartedStoreIds] = useState<Set<string>>(new Set());
  const [catalogEntries, setCatalogEntries] = useState<CatalogItemWithPrice[]>([]);
  // Feature: Price Catalog's per-item checkbox controls what shows in the
  // Cart tab. itemId -> includeInCart, built from the same fetchItems()
  // call catalogEntries already needed - false here means "hide this item
  // everywhere in Cart tab", not just from the browse/missing-items
  // section, so it's applied to cartRows below too (see visibleCartRows).
  const [includeInCartById, setIncludeInCartById] = useState<Map<string, boolean>>(new Map());
  // Long-press-to-move: which item (if any) the picker is currently open
  // for, and the full store list to choose a destination from - not
  // derived from `stores` above (StoreGroup[], only stores that already
  // have items in the current cart) since a move destination can be any
  // store, including one with nothing in the cart yet.
  const [movingItem, setMovingItem] = useState<ConsolidatedItem | null>(null);
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [editingPriceItem, setEditingPriceItem] = useState<ConsolidatedItem | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  useEffect(() => {
    fetchStores()
      .then(setAllStores)
      .catch(() => {
        /* non-critical - the move picker just shows fewer/no destination options if this fails */
      });
  }, []);

  useEffect(() => {
    Promise.all([fetchItems(), fetchAllStorePrices()])
      .then(([items, prices]) => {
        const itemsById = new Map(items.map((i) => [i.id, i]));
        setIncludeInCartById(new Map(items.map((i) => [i.id, i.includeInCart])));
        const entries: CatalogItemWithPrice[] = prices
          .filter((p) => itemsById.get(p.itemId)?.includeInCart !== false)
          .map((p) => ({
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

  // Applied before any of the grouping/total logic below, so an unchecked
  // item disappears from the Cart tab consistently everywhere at once -
  // the store/category views, the grand total, and the checkout manifest
  // built from itemsToBuy/stillAtHome all derive from this, not the raw
  // cartRows prop. Falls back to visible (!== false, not === true) if an
  // item's includeInCart hasn't loaded yet, so rows don't flash hidden
  // then reappear while that fetch is still in flight.
  const visibleCartRows = useMemo(
    () => {
      const query = searchText.trim().toLowerCase();
      return cartRows.filter(
        (row) =>
          includeInCartById.get(row.itemId) !== false &&
          (!query || row.itemName.toLowerCase().includes(query) || row.category.toLowerCase().includes(query))
      );
    },
    [cartRows, includeInCartById, searchText]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handleSavePrice = useCallback(async (price: number) => {
    if (!editingPriceItem) return;
    setIsSavingPrice(true);
    try {
      await onUpdatePrice(editingPriceItem.itemId, editingPriceItem.storeId, price);
      setEditingPriceItem(null);
    } finally {
      setIsSavingPrice(false);
    }
  }, [editingPriceItem, onUpdatePrice]);

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

  const handleRequestMove = useCallback((item: ConsolidatedItem) => {
    setMovingItem(item);
  }, []);

  const handleSelectMoveStore = useCallback(
    async (toStoreId: string) => {
      const item = movingItem;
      setMovingItem(null);
      if (!item) return;
      // No optimistic update here, unlike onIncrement/onPantryAdjust above -
      // a move can merge into an existing row at the destination or detach
      // a recipe-sourced row entirely (see CartService.moveCartItemToStore's
      // doc comment), and replicating that merge/detach logic correctly on
      // the frontend just to shave off one loadCart() round-trip isn't
      // worth the risk of the two falling out of sync for a deliberate,
      // infrequent action like this.
      await onMoveItem(item.itemId, item.storeId, toStoreId);
    },
    [movingItem, onMoveItem]
  );

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

  const { stores, excludedItems } = useMemo(() => consolidateCart(visibleCartRows), [visibleCartRows]);
  const { itemsToBuy, stillAtHome, excluded } = useMemo(() => groupByStatus(visibleCartRows), [visibleCartRows]);
  const categoryGroups = useMemo(() => groupByCategory(visibleCartRows), [visibleCartRows]);

  const missingCatalogItems = useMemo(
    () => (mode === 'HOME' ? buildMissingCatalogItems(visibleCartRows, catalogEntries) : []),
    [mode, visibleCartRows, catalogEntries]
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

  const reconcilingCheckedItems = reconcilingStore
    ? reconcilingStore.items.filter((item) => item.isCheckedCheckout)
    : [];

  return (
    <View style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cartculate</Text>
        </View>
        <View style={styles.headerRight}>
          <NeumoInset borderRadius={neumo.radiusSm} style={styles.totalInset}>
            <Text style={styles.totalText}>Total ₱{formatCurrency(grandTotal)}</Text>
          </NeumoInset>
          <Pressable
            onPress={() => {}}
            onLongPress={handleMasterResetLongPress}
            delayLongPress={2000}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
            style={({ pressed }) => [styles.masterResetButton, pressed && styles.masterResetButtonPressed]}
          >
            <Text style={styles.masterResetButtonText}>Hold to Reset</Text>
          </Pressable>
        </View>
      </View>

      {/* Snack fund removed per request - MONTHLY_BUDGET_LIMIT/budgetConfig.ts
          left intact so this can come back easily later. */}

      {modeLoading ? (
        <ActivityIndicator size="small" color={neumo.accent} style={styles.modeLoadingIndicator} />
      ) : (
        <>
        <View style={styles.modeRow}>
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

        </View>

        <View style={styles.filterRow}>
          <NeumoInset borderRadius={neumo.radiusSm} style={styles.searchInsetWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={neumo.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
          </NeumoInset>

          {mode === 'HOME' && (
            <NeumoInset borderRadius={11} style={styles.viewToggleInset}>
              {(['store', 'status', 'category'] as ViewMode[]).map((vm) => {
                const label = vm === 'store' ? 'By Store' : vm === 'status' ? 'By Status' : 'By Category';
                const active = viewMode === vm;
                return (
                  <TouchableOpacity key={vm} onPress={() => setViewMode(vm)} style={styles.viewButtonWrap}>
                    {active ? (
                      <NeumoRaised borderRadius={9} distance={2} style={styles.viewButtonRaised} fullWidth>
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
        </>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={neumo.accent} />}
        keyboardShouldPersistTaps="handled"
      >
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
                  onRequestMove={handleRequestMove}
                  onEditPrice={setEditingPriceItem}
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
                onRequestMove={handleRequestMove}
                onEditPrice={setEditingPriceItem}
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
                onRequestMove={handleRequestMove}
                onEditPrice={setEditingPriceItem}
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
                onRequestMove={handleRequestMove}
                onEditPrice={setEditingPriceItem}
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
                onRequestMove={handleRequestMove}
                onEditPrice={setEditingPriceItem}
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
                onRequestMove={handleRequestMove}
                onEditPrice={setEditingPriceItem}
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
              onRequestMove={handleRequestMove}
              onEditPrice={setEditingPriceItem}
            />
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        accessibilityLabel="Scroll to top"
        onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        style={styles.scrollTopButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <NeumoAccentRaised borderRadius={24} distance={3} style={styles.scrollTopButtonInner}>
          <Text style={styles.scrollTopButtonText}>↑</Text>
        </NeumoAccentRaised>
      </TouchableOpacity>

      <MoveToStoreModal
        visible={movingItem !== null}
        itemName={movingItem?.itemName ?? ''}
        currentStoreId={movingItem?.storeId ?? ''}
        stores={allStores}
        onCancel={() => setMovingItem(null)}
        onSelectStore={handleSelectMoveStore}
      />

      <ReconciliationModal
        visible={reconcilingStore !== null}
        storeName={reconcilingStore?.storeName ?? ''}
        checkedItems={reconcilingCheckedItems}
        onCancel={() => setReconcilingStore(null)}
        onConfirm={handleConfirmTrip}
        isSubmitting={isSubmittingTrip}
        onScanInstead={onNavigateToScanner}
      />

      <MasterResetModal
        visible={showResetConfirm}
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={handleConfirmReset}
      />

      <EditPriceModal
        visible={editingPriceItem !== null}
        itemName={editingPriceItem?.itemName ?? ''}
        storeName={editingPriceItem?.storeName ?? ''}
        currentPrice={editingPriceItem?.price ?? 0}
        isSaving={isSavingPrice}
        onCancel={() => setEditingPriceItem(null)}
        onSave={handleSavePrice}
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
  title: {
    ...neumoText.heading,
    fontSize: 18,
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
  searchInsetWrap: {
    flex: 0,
    width: '33%',
  },
  searchInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  scrollTopButton: {
    position: 'absolute',
    right: 18,
    bottom: 18,
  },
  scrollTopButtonInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollTopButtonText: {
    ...neumoText.heading,
    fontSize: 22,
    color: '#FFFFFF',
  },
  masterResetButton: {
    backgroundColor: neumo.danger,
    borderRadius: neumo.radiusSm,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  masterResetButtonPressed: {
    opacity: 0.6,
  },
  masterResetButtonText: {
    ...neumoText.heading,
    fontSize: 11,
    color: '#FFFFFF',
  },
  modeLoadingIndicator: {
    marginVertical: 8,
  },
  modeRow: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
  },
  viewButtonWrap: {
    flex: 1,
  },
  viewButtonRaised: {
    paddingVertical: 5,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  viewButtonFlat: {
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderRadius: 9,
    alignItems: 'center',
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