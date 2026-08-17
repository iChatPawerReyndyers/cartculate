import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import CartScreen from './src/screens/CartScreen';
import RecipeScreen from './src/screens/RecipeScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import ReceiptScannerScreen from './src/screens/ReceiptScannerScreen';
import GroceryHistoryScreen from './src/screens/GroceryHistoryScreen';
import { fetchCart, adjustCartItem, setPantryOverride, setCheckoutStatus, masterResetCheckout, completeCheckout } from './src/api/cartApi';
import { createPurchase } from './src/api/purchaseApi';
import { CURRENT_USER_ID } from './src/api/config';
import { ApiError } from './src/api/httpClient';
import { adjustOthersQuantity } from './src/utils/cartLogic';
import { CartRow, ManifestItem } from './src/types';

// Cart state lives here so both tabs can read/write it. On mount it's
// fetched from the real backend (GET /api/users/{userId}/cart); +/- taps
// update optimistically then call PATCH .../cart/adjust, rolling back via
// a refetch if the request fails.

type TabKey = 'cart' | 'recipes' | 'insights' | 'scan' | 'history';

const TABS: Record<'CART' | 'RECIPES' | 'INSIGHTS' | 'SCAN' | 'HISTORY', TabKey> = {
  CART: 'cart',
  RECIPES: 'recipes',
  INSIGHTS: 'insights',
  SCAN: 'scan',
  HISTORY: 'history',
};

// The bottom system nav (gesture bar or 3-button bar) rarely reports an
// inset smaller than this on real devices, but on some Android
// configurations react-native-safe-area-context can report 0 before the
// first native layout pass completes. This floor keeps tab buttons from
// ever visually touching the very edge of the screen even in that case.
const MIN_TAB_BAR_BOTTOM_PADDING = 8;

/**
 * SafeAreaProvider must wrap the app from above the component that calls
 * useSafeAreaInsets(), so the actual screen lives in AppContent() below and
 * this default export just supplies that provider. This also replaces the
 * previous root-level <SafeAreaView> from plain 'react-native' - that
 * component is iOS-only (RN's own docs confirm it's a no-op on Android),
 * so Android builds previously had ZERO protection from the status bar,
 * notches, or the gesture/3-button navigation bar overlapping app content.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>(TABS.CART);
  const [cartRows, setCartRows] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    try {
      const rows = await fetchCart(CURRENT_USER_ID);
      setCartRows(rows);
      setLoadError(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load cart.';
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleIncrement = useCallback(
    async (itemId: string, storeId: string) => {
      setCartRows((rows) => adjustOthersQuantity(rows, itemId, storeId, 1)); // optimistic
      try {
        await adjustCartItem(CURRENT_USER_ID, itemId, storeId, 1);
      } catch (err) {
        Alert.alert('Could not update cart', 'Please check your connection and try again.');
        loadCart(); // roll back to server state
      }
    },
    [loadCart]
  );

  const handleDecrement = useCallback(
    async (itemId: string, storeId: string) => {
      setCartRows((rows) => adjustOthersQuantity(rows, itemId, storeId, -1)); // optimistic
      try {
        await adjustCartItem(CURRENT_USER_ID, itemId, storeId, -1);
      } catch (err) {
        Alert.alert('Could not update cart', 'Please check your connection and try again.');
        loadCart(); // roll back to server state
      }
    },
    [loadCart]
  );

  const handlePantryAdjust = useCallback(
    async (rowId: string, delta: number) => {
      const row = cartRows.find((r) => r.id === rowId);
      if (!row) return;
      const newPantryQty = Math.max(0, row.overridePantryQty + delta);

      setCartRows((rows) =>
        rows.map((r) => (r.id === rowId ? { ...r, overridePantryQty: newPantryQty } : r))
      ); // optimistic

      try {
        await setPantryOverride(CURRENT_USER_ID, rowId, newPantryQty, row.overrideReason);
      } catch (err) {
        Alert.alert('Could not update pantry stock', 'Please check your connection and try again.');
        loadCart(); // roll back to server state
      }
    },
    [cartRows, loadCart]
  );

  /** Feature 2's Reason Logging: sets/clears overrideReason without touching overridePantryQty. */
  const handleSetPantryReason = useCallback(
    async (rowId: string, reason: string | null) => {
      const row = cartRows.find((r) => r.id === rowId);
      if (!row) return;

      setCartRows((rows) =>
        rows.map((r) => (r.id === rowId ? { ...r, overrideReason: reason } : r))
      ); // optimistic

      try {
        await setPantryOverride(CURRENT_USER_ID, rowId, row.overridePantryQty, reason);
      } catch (err) {
        Alert.alert('Could not update reason', 'Please check your connection and try again.');
        loadCart(); // roll back to server state
      }
    },
    [cartRows, loadCart]
  );

  /**
   * Feature 2's trigger condition: the Cart screen's main "-" button
   * intercepts a reduction that would dip below what active recipes need,
   * and opens the "Pantry Treasure Found" modal. Once a reason is chosen,
   * this bumps overridePantryQty by 1 AND sets the reason in a SINGLE
   * atomic update/API call.
   *
   * This is intentionally separate from calling handlePantryAdjust() and
   * handleSetPantryReason() back-to-back: both of those PATCH the same
   * combined { overridePantryQty, overrideReason } row via setPantryOverride,
   * each reading `cartRows` from its own closure. Firing them in the same
   * synchronous tick would race - the second call reads the pre-increment
   * qty (React hasn't re-rendered between the two calls yet) and would
   * overwrite the first call's result once its request lands, silently
   * cancelling out the +1.
   */
  const handlePantryTreasureFound = useCallback(
    async (rowId: string, reason: string) => {
      const row = cartRows.find((r) => r.id === rowId);
      if (!row) return;
      const newPantryQty = row.overridePantryQty + 1;

      setCartRows((rows) =>
        rows.map((r) =>
          r.id === rowId ? { ...r, overridePantryQty: newPantryQty, overrideReason: reason } : r
        )
      ); // optimistic, atomic

      try {
        await setPantryOverride(CURRENT_USER_ID, rowId, newPantryQty, reason);
      } catch (err) {
        Alert.alert('Could not log pantry stock', 'Please check your connection and try again.');
        loadCart(); // roll back to server state
      }
    },
    [cartRows, loadCart]
  );

  const handleToggleChecked = useCallback(
    async (rowId: string, checked: boolean) => {
      setCartRows((rows) =>
        rows.map((r) => (r.id === rowId ? { ...r, isCheckedCheckout: checked } : r))
      ); // optimistic

      try {
        await setCheckoutStatus(CURRENT_USER_ID, rowId, checked);
      } catch (err) {
        Alert.alert('Could not update checkout status', 'Please check your connection and try again.');
        loadCart(); // roll back to server state
      }
    },
    [loadCart]
  );

  /**
   * Feature 5 - Secure Master Hard-Reset Button. CartService.masterReset()
   * on the backend now zeroes every quantity AND clears every pantry
   * override AND resets every recipe multiplier - not just checkboxes like
   * before. The optimistic update here mirrors that full payload for cart
   * rows; recipe multipliers live in RecipeScreen's own state, which
   * refetches on its next mount, so nothing further is needed for those
   * here. Followed by a real loadCart() (unlike the other handlers here,
   * which only refetch on error) since a wipe this size is worth confirming
   * against the server rather than trusting the optimistic guess.
   */
  const handleMasterReset = useCallback(async () => {
    setCartRows((rows) =>
      rows.map((r) => ({
        ...r,
        quantity: 0,
        overridePantryQty: 0,
        overrideReason: null,
        isCheckedCheckout: false,
      }))
    ); // optimistic
    try {
      await masterResetCheckout(CURRENT_USER_ID);
      await loadCart();
    } catch (err) {
      Alert.alert('Could not reset', 'Please check your connection and try again.');
      loadCart(); // roll back to server state
    }
  }, [loadCart]);

  /**
   * Trip Conclusion (Feature 6): archives the receipt (POST .../purchases),
   * then clears the checked-off items for that store (POST .../complete-checkout).
   * `manifest.quantity` per item now reflects what was ACTUALLY bought
   * (ReconciliationModal's "Qty bought" stepper defaults to the full need
   * but is adjustable down) - passed through as boughtItems so the backend
   * only reduces each cart row by that amount, leaving any unbought
   * remainder in the cart instead of always zeroing it out.
   * Not optimistic - both calls must succeed before the cart reflects the
   * trip as done, since this represents real money spent and a real
   * archived record, not a quick UI toggle.
   */
  const handleCompleteTrip = useCallback(
    async (storeId: string, actualTotal: number, manifest: ManifestItem[]): Promise<boolean> => {
      try {
        await createPurchase(CURRENT_USER_ID, {
          storeId,
          totalReceiptSpent: actualTotal,
          purchaseDate: new Date().toISOString(),
          items: manifest,
        });
        await completeCheckout(
          CURRENT_USER_ID,
          storeId,
          manifest.map((item) => ({ itemId: item.itemId, quantityBought: item.quantity }))
        );
        await loadCart();
        return true;
      } catch (err) {
        Alert.alert('Could not log this trip', 'Please check your connection and try again.');
        return false;
      }
    },
    [loadCart]
  );

  /**
   * Manual "Add item": creates a brand-new cart row via the existing
   * adjust endpoint (delta = the entered quantity, not just +/-1). The
   * backend's adjustOthersQuantity already creates a fresh row when none
   * exists and delta > 0, so no new endpoint was needed for this.
   */
  const handleAddItem = useCallback(
    async (itemId: string, storeId: string, quantity: number) => {
      try {
        await adjustCartItem(CURRENT_USER_ID, itemId, storeId, quantity);
        await loadCart();
      } catch (err) {
        Alert.alert('Could not add item', 'Please check your connection and try again.');
      }
    },
    [loadCart]
  );

  // Loading/error states are their own full screens (rendered before the
  // tab bar even exists), so they need their own top+bottom inset padding
  // rather than inheriting it from the main layout below.
  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color="#2FAF7E" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <Text style={styles.errorTitle}>Couldn't load your cart</Text>
        <Text style={styles.errorSubtitle}>{loadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCart}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    // Plain View, not SafeAreaView: the background fills edge-to-edge
    // (behind the status bar and the bottom nav bar/gesture area) while
    // only the CONTENT is pushed inward via explicit inset padding below -
    // paddingTop here for the status bar/notch/Dynamic Island, and
    // paddingBottom specifically on the tab bar (not this whole container)
    // so the tab bar's own background can still reach the very bottom edge
    // while its buttons stay clear of the gesture bar / 3-button nav.
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={Platform.OS === 'android'} />
      <View style={styles.screenContainer}>
        {activeTab === TABS.CART && (
          <CartScreen
            cartRows={cartRows}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onPantryAdjust={handlePantryAdjust}
            onSetPantryReason={handleSetPantryReason}
            onPantryTreasureFound={handlePantryTreasureFound}
            onToggleChecked={handleToggleChecked}
            onMasterReset={handleMasterReset}
            onCompleteTrip={handleCompleteTrip}
            onAddItem={handleAddItem}
            onNavigateToScanner={() => setActiveTab(TABS.SCAN)}
          />
        )}
        {activeTab === TABS.RECIPES && (
          <RecipeScreen onCartChanged={loadCart} />
        )}
        {activeTab === TABS.INSIGHTS && <InsightsScreen />}
        {activeTab === TABS.SCAN && <ReceiptScannerScreen />}
        {activeTab === TABS.HISTORY && <GroceryHistoryScreen />}
      </View>

      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, MIN_TAB_BAR_BOTTOM_PADDING) }]}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab(TABS.CART)}
        >
          <Text style={[styles.tabLabel, activeTab === TABS.CART && styles.tabLabelActive]}>
            Cart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab(TABS.RECIPES)}
        >
          <Text style={[styles.tabLabel, activeTab === TABS.RECIPES && styles.tabLabelActive]}>
            Recipes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab(TABS.INSIGHTS)}
        >
          <Text style={[styles.tabLabel, activeTab === TABS.INSIGHTS && styles.tabLabelActive]}>
            Insights
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab(TABS.SCAN)}
        >
          <Text style={[styles.tabLabel, activeTab === TABS.SCAN && styles.tabLabelActive]}>
            Pricing
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab(TABS.HISTORY)}
        >
          <Text style={[styles.tabLabel, activeTab === TABS.HISTORY && styles.tabLabelActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F0',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2FAF7E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabLabel: {
    fontSize: 13,
    color: '#9A9A9A',
  },
  tabLabelActive: {
    color: '#1A1A1A',
    fontWeight: '500',
  },
});
