import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { neumo, neumoText, NeumoRaised } from '../utils/neumorphic';
import { Store } from '../api/storeApi';

interface MoveToStoreModalProps {
  visible: boolean;
  itemName: string;
  currentStoreId: string;
  stores: Store[];
  onCancel: () => void;
  onSelectStore: (storeId: string) => void;
}

/**
 * Long-press an item's name on the Cart tab to move it to a different
 * store - e.g. "only need one thing from Puregold, might as well get it
 * at S&R instead." Lists every OTHER store as a tappable row; the
 * current store is excluded since moving "to itself" isn't a real
 * choice. See CartService.moveCartItemToStore() on the backend for what
 * actually happens to the underlying cart row(s), including why this is
 * a one-time override for recipe-sourced items rather than a permanent
 * reroute.
 */
export default function MoveToStoreModal({
  visible,
  itemName,
  currentStoreId,
  stores,
  onCancel,
  onSelectStore,
}: MoveToStoreModalProps) {
  const otherStores = stores.filter((s) => s.id !== currentStoreId);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Move to a different store</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {itemName}
          </Text>

          {otherStores.length === 0 ? (
            <Text style={styles.emptyText}>No other stores to move this to yet.</Text>
          ) : (
            <View style={styles.storeList}>
              {otherStores.map((store) => (
                <TouchableOpacity key={store.id} onPress={() => onSelectStore(store.id)} activeOpacity={0.7}>
                  <NeumoRaised borderRadius={10} distance={3} style={styles.storeRow} fullWidth>
                    <Text style={styles.storeName}>{store.name}</Text>
                  </NeumoRaised>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(58,67,88,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: neumo.background,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    ...neumoText.subheading,
    fontSize: 15,
    color: neumo.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    ...neumoText.caption,
    fontSize: 12,
    color: neumo.textMuted,
    marginBottom: 14,
  },
  emptyText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
    paddingVertical: 12,
    textAlign: 'center',
  },
  storeList: {
    gap: 8,
  },
  storeRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  storeName: {
    ...neumoText.body,
    fontSize: 14,
    color: neumo.textPrimary,
  },
  cancelButton: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  cancelText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textMuted,
  },
});