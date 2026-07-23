import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import CartScreen from './src/screens/CartScreen';
import RecipeScreen from './src/screens/RecipeScreen';
import { mockCartRows } from './src/data/mockCartData';
import { CartRow } from './src/types';

// Cart state lives here so both tabs can read/write it without a backend
// round trip. Once the Spring Boot API exists, this can be swapped for a
// context provider backed by real fetch/mutation calls.

type TabKey = 'cart' | 'recipes';

const TABS: Record<'CART' | 'RECIPES', TabKey> = {
  CART: 'cart',
  RECIPES: 'recipes',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>(TABS.CART);
  const [cartRows, setCartRows] = useState<CartRow[]>(mockCartRows);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screenContainer}>
        {activeTab === TABS.CART ? (
          <CartScreen cartRows={cartRows} setCartRows={setCartRows} />
        ) : (
          <RecipeScreen
            cartRows={cartRows}
            setCartRows={setCartRows}
            onNavigateToCart={() => setActiveTab(TABS.CART)}
          />
        )}
      </View>

      <View style={styles.tabBar}>
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F0',
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