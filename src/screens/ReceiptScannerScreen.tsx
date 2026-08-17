import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
} from 'react-native-image-picker';
import ReceiptLineItemCard from '../components/ReceiptLineItemCard';
import PriceCatalogView from '../components/PriceCatalogView';
import { scanReceipt } from '../api/receiptScanApi';
import { applyManualMatch, isReadyToConfirm, buildStorePriceUpdates, buildPurchaseHistoryFromReceipt } from '../utils/receiptLogic';
import { createPurchase } from '../api/purchaseApi';
import { updateStorePrices } from '../api/storePriceApi';
import { CURRENT_USER_ID } from '../api/config';
import { ApiError } from '../api/httpClient';
import { ReceiptScanResult } from '../types';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

type ScreenState = 'idle' | 'processing' | 'reviewing' | 'confirming';
type SubTab = 'scan' | 'catalog';

/**
 * VISUAL: built on the neumorphic primitives in utils/neumorphic.tsx -
 * the sub-tab bar is an inset track with a raised active pill (matching
 * CartScreen's mode toggle pattern), primary CTAs are raised accent
 * buttons, and the secondary "Upload from gallery" action is an inset
 * button. No logic changed in this pass.
 */
export default function ReceiptScannerScreen() {
  const [subTab, setSubTab] = useState<SubTab>('catalog');
  const [screenState, setScreenState] = useState<ScreenState>('idle');
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);

  const handlePickAsset = useCallback(async (asset: Asset | undefined) => {
    if (!asset?.uri || !asset?.base64) {
      Alert.alert('Scan failed', 'Could not read that image. Please try again.');
      return;
    }
    setScreenState('processing');
    try {
      const result = await scanReceipt(asset.base64, asset.type ?? 'image/jpeg');
      setScanResult(result);
      setScreenState('reviewing');
    } catch (err) {
      Alert.alert('Scan failed', 'Could not read that receipt. Please try again.');
      setScreenState('idle');
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const result = await launchCamera({ mediaType: 'photo', quality: 0.8, includeBase64: true });
    if (result.didCancel) return;
    handlePickAsset(result.assets?.[0]);
  }, [handlePickAsset]);

  const handleUploadPhoto = useCallback(async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, includeBase64: true });
    if (result.didCancel) return;
    handlePickAsset(result.assets?.[0]);
  }, [handlePickAsset]);

  const handleSelectMatch = useCallback(
    (lineItemId: string, itemId: string, itemName: string) => {
      setScanResult((current) =>
        current ? applyManualMatch(current, lineItemId, itemId, itemName) : current
      );
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!scanResult) return;
    setScreenState('confirming');

    try {
      const priceUpdates = buildStorePriceUpdates(scanResult);
      await updateStorePrices(
        scanResult.storeId,
        priceUpdates.map((u) => ({ itemId: u.itemId, priceAmount: u.priceAmount }))
      );

      const receiptPayload = buildPurchaseHistoryFromReceipt(scanResult);
      await createPurchase(CURRENT_USER_ID, receiptPayload);

      Alert.alert('Confirmed', 'Store prices and purchase history updated.');
      setScanResult(null);
      setScreenState('idle');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save this receipt.';
      Alert.alert('Confirm failed', message);
      setScreenState('reviewing');
    }
  }, [scanResult]);

  // Wrap the two static tab targets in touch handlers even when rendered
  // as the raised (already-active) pill, so tapping the already-active
  // tab is a harmless no-op rather than dead space - kept as separate
  // TouchableOpacitys below since NeumoRaised itself isn't touchable.
  const subTabBarWithHandlers = (
    <NeumoInset borderRadius={12} style={styles.subTabBarInset}>
      <TouchableOpacity style={styles.subTabButtonWrap} onPress={() => setSubTab('catalog')}>
        {subTab === 'catalog' ? (
          <NeumoRaised borderRadius={9} distance={2} style={styles.subTabButtonRaised} fullWidth>
            <Text style={styles.subTabButtonTextActive}>💲 Price Catalog</Text>
          </NeumoRaised>
        ) : (
          <View style={styles.subTabButtonFlat}>
            <Text style={styles.subTabButtonText}>💲 Price Catalog</Text>
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.subTabButtonWrap} onPress={() => setSubTab('scan')}>
        {subTab === 'scan' ? (
          <NeumoRaised borderRadius={9} distance={2} style={styles.subTabButtonRaised} fullWidth>
            <Text style={styles.subTabButtonTextActive}>📷 Scan Receipt</Text>
          </NeumoRaised>
        ) : (
          <View style={styles.subTabButtonFlat}>
            <Text style={styles.subTabButtonText}>📷 Scan Receipt</Text>
          </View>
        )}
      </TouchableOpacity>
    </NeumoInset>
  );

  if (subTab === 'catalog') {
    return (
      <View style={styles.safeArea}>
        {subTabBarWithHandlers}
        <PriceCatalogView />
      </View>
    );
  }

  if (screenState === 'idle') {
    return (
      <View style={styles.safeArea}>
        {subTabBarWithHandlers}
        <View style={styles.centerContent}>
          <Text style={styles.title}>Scan a receipt</Text>
          <Text style={styles.subtitle}>
            We'll match each line item to your master list automatically.
          </Text>
          <TouchableOpacity onPress={handleTakePhoto} style={styles.primaryButtonWrap}>
            <NeumoAccentRaised borderRadius={neumo.radiusSm} distance={4} fullWidth style={styles.primaryButtonInner}>
              <Text style={styles.primaryButtonText}>Take photo</Text>
            </NeumoAccentRaised>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleUploadPhoto} style={styles.secondaryButtonWrap}>
            <NeumoInset borderRadius={neumo.radiusSm} style={styles.secondaryButtonInset}>
              <Text style={styles.secondaryButtonText}>Upload from gallery</Text>
            </NeumoInset>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (screenState === 'processing') {
    return (
      <View style={styles.safeArea}>
        {subTabBarWithHandlers}
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={neumo.accent} />
          <Text style={styles.subtitle}>Reading receipt and matching items…</Text>
        </View>
      </View>
    );
  }

  const readyToConfirm = scanResult ? isReadyToConfirm(scanResult) : false;
  const isConfirming = screenState === 'confirming';

  return (
    <View style={styles.safeArea}>
      {subTabBarWithHandlers}
      <View style={styles.header}>
        <Text style={styles.title}>Verify receipt</Text>
        <Text style={styles.subtitle}>
          {scanResult?.storeName} · scanned just now
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {scanResult?.lineItems.map((line) => (
          <ReceiptLineItemCard
            key={line.id}
            line={line}
            onSelectMatch={handleSelectMatch}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={handleConfirm}
        disabled={!readyToConfirm || isConfirming}
        style={styles.confirmButtonWrap}
      >
        <NeumoAccentRaised
          borderRadius={neumo.radiusSm}
          distance={4}
          fullWidth
          style={[styles.confirmButtonInner, (!readyToConfirm || isConfirming) && styles.confirmButtonDisabled]}
        >
          {isConfirming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {readyToConfirm ? 'Confirm & update Store Prices' : 'Resolve flagged items first'}
            </Text>
          )}
        </NeumoAccentRaised>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: neumo.background,
  },
  subTabBarInset: {
    flexDirection: 'row',
    padding: 3,
    marginHorizontal: 12,
    marginTop: 12,
  },
  subTabButtonWrap: {
    flex: 1,
  },
  subTabButtonRaised: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  subTabButtonFlat: {
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  subTabButtonText: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
  },
  subTabButtonTextActive: {
    ...neumoText.heading,
    fontSize: 13,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
  },
  title: {
    ...neumoText.heading,
    fontSize: 18,
    marginBottom: 6,
  },
  subtitle: {
    ...neumoText.body,
    fontSize: 13,
    color: neumo.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  primaryButtonWrap: {
    width: '100%',
    marginHorizontal: 16,
  },
  primaryButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...neumoText.heading,
    fontSize: 14,
    color: '#FFFFFF',
  },
  secondaryButtonWrap: {
    width: '100%',
    marginTop: 10,
  },
  secondaryButtonInset: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...neumoText.heading,
    fontSize: 14,
  },
  confirmButtonWrap: {
    marginHorizontal: 12,
    marginBottom: 16,
  },
  confirmButtonInner: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
});