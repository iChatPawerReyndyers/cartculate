import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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
import SelectField from '../components/SelectField';
import { scanReceipt } from '../api/receiptScanApi';
import {
  applyManualMatch,
  isReadyToConfirm,
  buildStorePriceUpdates,
  buildPurchaseHistoryFromReceipt,
} from '../utils/receiptLogic';
import { sanitizeDateInput, isValidDateInput } from '../utils/inputSanitization';
import { createPurchase } from '../api/purchaseApi';
import { updatePersonalStorePrices } from '../api/storePriceApi';
import { fetchStores, createStore, Store } from '../api/storeApi';
import { CURRENT_USER_ID } from '../api/config';
import { ApiError } from '../api/httpClient';
import { ReceiptScanResult } from '../types';
import { neumo, neumoText, NeumoRaised, NeumoInset, NeumoAccentRaised } from '../utils/neumorphic';

const ADD_NEW_STORE_VALUE = '__add_new_store__';

/** "2026-09-14T10:03:00" -> "2026-09-14". Used to seed the editable date
 * field from the scan's own timestamp, and as a fallback if that's ever
 * missing/malformed. */
function toDateOnly(isoTimestamp: string): string {
  const datePart = isoTimestamp.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : todayDateOnly();
}

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const [stores, setStores] = useState<Store[]>([]);
  // Seeded from the OCR-detected store once a scan completes, but always
  // user-editable from here - OCR can misread a store name or fail to
  // match one at all, so this is a real "which store is this?" prompt,
  // not just a read-only label.
  const [storePickerValue, setStorePickerValue] = useState<string>('');
  const [newStoreText, setNewStoreText] = useState('');
  // Seeded from the scan's own timestamp, but always user-editable - the
  // AI never reads a date off the receipt itself, and a receipt is often
  // scanned well after the actual shopping trip, so this is a real "when
  // did this happen?" prompt, not just a read-only "scanned just now" label.
  const [purchaseDateText, setPurchaseDateText] = useState<string>(todayDateOnly());

  useEffect(() => {
    fetchStores()
      .then(setStores)
      .catch(() => {
        // Non-fatal: the picker just shows fewer options (or none) if
        // this fails - scanning/reviewing still works, and stores are
        // refetched fresh next time the screen mounts.
      });
  }, []);

  const handlePickAsset = useCallback(async (asset: Asset | undefined) => {
    if (!asset?.uri || !asset?.base64) {
      Alert.alert('Scan failed', 'Could not read that image. Please try again.');
      return;
    }
    setScreenState('processing');
    try {
      const result = await scanReceipt(asset.base64, asset.type ?? 'image/jpeg');
      setScanResult(result);
      setStorePickerValue(result.storeId);
      setNewStoreText('');
      setPurchaseDateText(toDateOnly(result.scannedAt));
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

    if (storePickerValue === ADD_NEW_STORE_VALUE && newStoreText.trim().length === 0) {
      Alert.alert('Store name needed', "Type the new store's name before confirming.");
      return;
    }
    if (!isValidDateInput(purchaseDateText)) {
      Alert.alert('Check the date', 'Enter a valid date (YYYY-MM-DD) for when this receipt was from.');
      return;
    }

    setScreenState('confirming');

    try {
      let resolvedStoreId = storePickerValue;
      let resolvedStoreName = stores.find((s) => s.id === storePickerValue)?.name ?? scanResult.storeName;

      if (storePickerValue === ADD_NEW_STORE_VALUE) {
        const created = await createStore(newStoreText.trim());
        resolvedStoreId = created.id;
        resolvedStoreName = created.name;
        setStores((current) => [...current, created]);
      }

      // Patch the resolved store into scanResult rather than threading a
      // separate storeId through buildStorePriceUpdates/
      // buildPurchaseHistoryFromReceipt - both already read storeId
      // straight off scanResult, so this keeps receiptLogic.ts untouched.
      const finalScanResult: ReceiptScanResult = {
        ...scanResult,
        storeId: resolvedStoreId,
        storeName: resolvedStoreName,
      };

      const priceUpdates = buildStorePriceUpdates(finalScanResult);
      // Feature: personal price overrides. A scanned receipt is
      // inherently CURRENT_USER_ID's own purchase at their own suki/store
      // visit - confirming it now sets their PERSONAL price for these
      // items, not the shared baseline everyone else sees. Someone else
      // scanning a receipt for the same item at the same nominal store
      // can get a different price without either of them overwriting the
      // other. See storePriceApi.ts's updatePersonalStorePrices.
      await updatePersonalStorePrices(
        resolvedStoreId,
        priceUpdates.map((u) => ({ itemId: u.itemId, priceAmount: u.priceAmount })),
        'SCAN'
      );

      const receiptPayload = buildPurchaseHistoryFromReceipt(finalScanResult, purchaseDateText);
      await createPurchase(CURRENT_USER_ID, receiptPayload);

      Alert.alert('Confirmed', 'Store prices and purchase history updated.');
      setScanResult(null);
      setStorePickerValue('');
      setNewStoreText('');
      setPurchaseDateText(todayDateOnly());
      setScreenState('idle');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save this receipt.';
      Alert.alert('Confirm failed', message);
      setScreenState('reviewing');
    }
  }, [scanResult, storePickerValue, newStoreText, purchaseDateText, stores]);

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

  const hasValidStoreSelection =
    storePickerValue !== '' && (storePickerValue !== ADD_NEW_STORE_VALUE || newStoreText.trim().length > 0);
  const hasValidDate = isValidDateInput(purchaseDateText);
  const readyToConfirm = scanResult ? isReadyToConfirm(scanResult) && hasValidStoreSelection && hasValidDate : false;
  const isConfirming = screenState === 'confirming';

  const storeOptions = [
    ...stores.map((store) => ({ label: store.name, value: store.id })),
    { label: '+ Add new store...', value: ADD_NEW_STORE_VALUE },
  ];

  return (
    <View style={styles.safeArea}>
      {subTabBarWithHandlers}
      <View style={styles.header}>
        <Text style={styles.title}>Verify receipt</Text>
        <Text style={styles.fieldLabel}>Register this receipt to which store?</Text>
        <SelectField
          value={storePickerValue}
          options={storeOptions}
          sheetTitle="Store"
          onChange={(value) => {
            setStorePickerValue(value);
            if (value !== ADD_NEW_STORE_VALUE) setNewStoreText('');
          }}
        />
        {storePickerValue === ADD_NEW_STORE_VALUE && (
          <NeumoInset borderRadius={neumo.radiusSm} style={styles.newStoreInsetWrap}>
            <TextInput
              style={styles.newStoreInput}
              value={newStoreText}
              onChangeText={setNewStoreText}
              placeholder="Type the new store's name"
              placeholderTextColor={neumo.textMuted}
              autoFocus
            />
          </NeumoInset>
        )}

        <Text style={styles.fieldLabel}>When was this receipt from?</Text>
        <NeumoInset borderRadius={neumo.radiusSm} style={styles.dateInsetWrap}>
          <TextInput
            style={styles.dateInput}
            value={purchaseDateText}
            onChangeText={(text) => setPurchaseDateText(sanitizeDateInput(text))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={neumo.textMuted}
            keyboardType="number-pad"
            maxLength={10}
          />
        </NeumoInset>
        {!hasValidDate && (
          <Text style={styles.dateHintText}>Enter a real date, e.g. {todayDateOnly()}.</Text>
        )}
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
              {readyToConfirm
                ? 'Confirm & update Store Prices'
                : !hasValidStoreSelection
                ? 'Select a store first'
                : !hasValidDate
                ? 'Enter a valid date first'
                : 'Resolve flagged items first'}
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
  fieldLabel: {
    ...neumoText.caption,
    fontSize: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  newStoreInsetWrap: {
    marginTop: 6,
  },
  newStoreInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: neumo.textPrimary,
  },
  dateInsetWrap: {
    marginTop: 6,
  },
  dateInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: neumo.textPrimary,
  },
  dateHintText: {
    ...neumoText.caption,
    fontSize: 10,
    color: neumo.dangerDark,
    marginTop: 4,
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