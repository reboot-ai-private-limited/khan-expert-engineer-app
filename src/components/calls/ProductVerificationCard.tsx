import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ProductVideoSlot } from '@/components/calls/ProductVideoSlot';
import { IDENTITY_LABELS, IDENTITY_PLACEHOLDERS, isOfficeSet } from '@/utils/identityLock';
import { compressAsset } from '@/utils/imageCapture';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { captureIntent } from '@/services/storage/captureIntent';
import { usePendingCapture } from '@/hooks/usePendingCapture';
import { uploadQueue } from '@/services/storage/uploadQueue';
import { readAsDataUri } from '@/utils/localFile';
import { parseTypedDate, toTypedDate } from '@/utils/dateInput';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerCall, ServiceImageCategory, WarrantyStatus } from '@/types/call';

interface ProductVerificationCardProps {
  call: EngineerCall;
  onUpdated: (call: EngineerCall) => void;
}

/**
 * One identity field: editable when it is blank or the engineer's own,
 * read-only once the office has recorded it.
 *
 * Shown rather than hidden when locked — the engineer still needs to read
 * the serial off the ticket to check it against the nameplate.
 */
const IdentityField: React.FC<{
  call: EngineerCall;
  field: 'modelNumber' | 'serialNumber' | 'iduser' | 'oduser';
  value: string;
  onChangeText: (next: string) => void;
}> = ({ call, field, value, onChangeText }) => {
  const locked = isOfficeSet(call, field);

  if (locked) {
    return (
      <View style={styles.lockedField}>
        <Text style={[typography.label, styles.lockedLabel]}>{IDENTITY_LABELS[field]}</Text>
        <Text style={[typography.body, styles.lockedValue]}>{value}</Text>
        <Text style={[typography.caption, styles.lockedHint]}>
          Set by the office. Tell them if the nameplate disagrees.
        </Text>
      </View>
    );
  }

  return (
    <TextField
      label={IDENTITY_LABELS[field]}
      value={value}
      onChangeText={onChangeText}
      placeholder={IDENTITY_PLACEHOLDERS[field]}
      autoCapitalize="characters"
    />
  );
};

/** One labeled camera capture slot for a single product/warranty document category. */
const PhotoSlot: React.FC<{
  label: string;
  required?: boolean;
  existingUrl?: string;
  /** A private photo (the bill) is saved but has no public link to preview. */
  savedPrivately?: boolean;
  busy: boolean;
  onCapture: () => void;
}> = ({ label, required, existingUrl, savedPrivately, busy, onCapture }) => (
  <View style={styles.photoSlot}>
    <Text style={[typography.caption, styles.photoLabel]}>
      {label}
      {required ? ' *' : ''}
    </Text>
    {existingUrl ? (
      <Image source={{ uri: existingUrl }} style={styles.photoPreview} />
    ) : (
      <View style={styles.photoPlaceholder}>
        <Text style={[typography.caption, styles.photoPlaceholderText]}>
          {savedPrivately ? '✓ Saved (kept private)' : 'Not captured'}
        </Text>
      </View>
    )}
    <Pressable
      onPress={onCapture}
      disabled={busy}
      style={({ pressed }) => [styles.photoButton, pressed && styles.photoButtonPressed, busy && styles.photoButtonDisabled]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.brand} />
      ) : (
        <Text style={[typography.caption, styles.photoButtonText]}>{existingUrl || savedPrivately ? 'Retake' : 'Take photo'}</Text>
      )}
    </Pressable>
  </View>
);

const WARRANTY_LABEL: Record<WarrantyStatus, string> = {
  in_warranty: 'In warranty — no charge for labour under warranty terms',
  out_of_warranty: 'Out of warranty — chargeable',
  disputed: 'Disputed — office will resolve',
  extended: 'Extended / AMC cover applies',
};

/** Why the check came out the way it did — the engineer should never have to guess. */
const warrantyReason = (call: EngineerCall): string => {
  const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (call.warrantyStatus === 'disputed') return '';
  if (call.warrantyValidUntil) {
    return call.warrantyStatus === 'in_warranty' || call.warrantyStatus === 'extended'
      ? `Covered until ${day(call.warrantyValidUntil)}`
      : `Warranty ended on ${day(call.warrantyValidUntil)}`;
  }
  if (/out\s*of\s*warranty/i.test(call.warrantyTerms || '') || call.warrantyYears === 0) {
    return 'The office booked this job as out of warranty';
  }
  return call.warrantyStatus === 'out_of_warranty' ? 'No purchase bill — a bill is needed for warranty' : '';
};

const WARRANTY_TONE: Record<WarrantyStatus, 'success' | 'warning' | 'error'> = {
  in_warranty: 'success',
  out_of_warranty: 'warning',
  disputed: 'error',
  extended: 'success',
};

/**
 * The product-verification step — placed right after check-in, before any
 * work starts. The engineer confirms/corrects what the office booked from
 * a phone call, and establishes warranty before doing any chargeable work
 * (mobile/docs/specs/12-product-details.md).
 */
export const ProductVerificationCard: React.FC<ProductVerificationCardProps> = ({ call, onUpdated }) => {
  const [brandName, setBrandName] = useState(call.brandName ?? '');
  const [productsName, setProductsName] = useState(call.productsName ?? '');
  const [modelNumber, setModelNumber] = useState(call.modelNumber ?? '');
  const [serialNumber, setSerialNumber] = useState(call.serialNumber ?? '');
  const [iduser, setIduser] = useState(call.iduser ?? '');
  const [oduser, setOduser] = useState(call.oduser ?? '');
  const [capacity, setCapacity] = useState(call.capacity ?? '');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsSaved, setDetailsSaved] = useState(false);

  const [photoBusy, setPhotoBusy] = useState<ServiceImageCategory | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [hasBill, setHasBill] = useState<boolean | null>(null);
  const [dateOfPurchase, setDateOfPurchase] = useState(call.dateofPurchase ? toTypedDate(call.dateofPurchase.slice(0, 10)) : '');
  const [billNumber, setBillNumber] = useState(call.billNumber ?? '');
  const [dealerName, setDealerName] = useState(call.dealerName ?? '');
  const [warrantyBusy, setWarrantyBusy] = useState(false);
  /** Reopens the bill form after a result is saved — a wrong date or a bill found later. */
  const [recheckingWarranty, setRecheckingWarranty] = useState(false);
  const [warrantyError, setWarrantyError] = useState<string | null>(null);

  const imageOf = (category: ServiceImageCategory) =>
    (call.service_images ?? []).slice().reverse().find((img) => img.category === category);

  /**
   * Retries anything queued for this job — a photo captured last session
   * whose upload never finished because the app was killed mid-request.
   * Runs quietly on mount; a queued item that still can't upload (still
   * offline) stays queued for next time; one whose cached file is gone is dropped.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pending = await uploadQueue.getForCall(call._id);
      for (const item of pending) {
        let dataUri: string;
        try {
          dataUri = await readAsDataUri(item.localUri, item.mimeType);
        } catch {
          // The cached file is gone (the phone cleared its cache). It can
          // never upload, so drop it rather than retrying it forever.
          await uploadQueue.remove(item.id);
          continue;
        }
        try {
          const images = await engineerCallsApi.uploadCategorizedImage(call._id, dataUri, item.category);
          if (!cancelled) onUpdated({ ...call, service_images: images });
          await uploadQueue.remove(item.id);
        } catch {
          // Offline or a server hiccup — left queued, retried next time this screen opens.
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call._id]);

  /**
   * A photo taken while Android killed the app mid-capture (the camera
   * activity being in front is exactly when the system reclaims memory by
   * killing the app behind it — see captureIntent.ts). The photo itself was
   * never lost; only the app's memory of what it was for. Without this it
   * looks like taking the photo made the app "restart" and lose the shot.
   */
  usePendingCapture('job-photo', call._id, async (dataUri, detail) => {
    const category = detail as ServiceImageCategory | undefined;
    if (!category) return;
    setPhotoError(null);
    setPhotoBusy(category);
    try {
      const images = await engineerCallsApi.uploadCategorizedImage(call._id, dataUri, category);
      onUpdated({ ...call, service_images: images });
    } catch (err) {
      setPhotoError(
        isNetworkError(err)
          ? 'Photo recovered. It will upload once you have signal — reopen this job to retry.'
          : (serverMessage(err) ?? 'The photo was recovered but did not upload. Try taking it again.')
      );
    } finally {
      setPhotoBusy(null);
    }
  });

  const capturePhoto = async (category: ServiceImageCategory) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError('Camera access is off for this app. Enable it in your phone settings.');
      return;
    }

    // Recorded BEFORE the camera opens: if the app is killed while it is in
    // front, this is the only record of what the photo was for.
    await captureIntent.set({ purpose: 'job-photo', callId: call._id, detail: category });

    // Resized before encoding — a full-resolution base64 was exhausting the
    // heap and getting the app killed. See utils/imageCapture.ts.
    const result = await ImagePicker.launchCameraAsync({ quality: 1, mediaTypes: ['images'] });
    if (result.canceled) {
      await captureIntent.clear();
      return;
    }
    const asset = result.assets[0];
    const dataUri = (await compressAsset(asset)).dataUri;
    await captureIntent.clear();

    // Durably queued BEFORE the network call — if the app is killed while
    // uploading, this survives the restart and gets retried on next open,
    // instead of the photo silently disappearing.
    const queueId = `${category}-${Date.now()}`;
    await uploadQueue.add({
      id: queueId,
      callId: call._id,
      category,
      localUri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      createdAt: new Date().toISOString(),
    });

    setPhotoError(null);
    setPhotoBusy(category);
    try {
      const images = await engineerCallsApi.uploadCategorizedImage(call._id, dataUri, category);
      onUpdated({ ...call, service_images: images });
      await uploadQueue.remove(queueId);
    } catch (err) {
      // Stays queued — retried automatically next time this screen opens.
      setPhotoError(
        isNetworkError(err)
          ? 'Saved on your device. It will upload automatically once you have signal and reopen this job.'
          : (serverMessage(err) ?? 'The photo did not upload — it is saved and will retry automatically.')
      );
    } finally {
      setPhotoBusy(null);
    }
  };

  const saveDetails = async () => {
    setDetailsError(null);
    setDetailsSaved(false);
    setSavingDetails(true);
    try {
      const updated = await engineerCallsApi.updateProductDetails(
        call._id,
        // Office-owned fields are never submitted: the server refuses them,
        // and sending an unchanged value would only risk a spurious refusal.
        {
          brandName,
          productsName,
          capacity,
          ...(isOfficeSet(call, 'modelNumber') ? {} : { modelNumber }),
          ...(isOfficeSet(call, 'serialNumber') ? {} : { serialNumber }),
          ...(isOfficeSet(call, 'iduser') ? {} : { iduser }),
          ...(isOfficeSet(call, 'oduser') ? {} : { oduser }),
        },
        'nameplate'
      );
      onUpdated(updated);
      setDetailsSaved(true);
    } catch (err) {
      setDetailsError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not save these details.'));
    } finally {
      setSavingDetails(false);
    }
  };

  const submitWarranty = async () => {
    if (hasBill === null) {
      setWarrantyError('Select whether the customer has a purchase bill.');
      return;
    }
    if (hasBill && !dateOfPurchase.trim()) {
      setWarrantyError('Date of purchase is required when a bill is available.');
      return;
    }
    // Read as DD/MM/YYYY (or YYYY-MM-DD) and sent as YYYY-MM-DD — never left
    // to the server to guess the order.
    const purchaseIso = hasBill ? parseTypedDate(dateOfPurchase) : null;
    if (hasBill && !purchaseIso) {
      setWarrantyError('Enter the purchase date as DD/MM/YYYY, e.g. 28/02/2025.');
      return;
    }
    if (purchaseIso && new Date(`${purchaseIso}T00:00:00`) > new Date()) {
      setWarrantyError('The purchase date cannot be in the future.');
      return;
    }

    setWarrantyError(null);
    setWarrantyBusy(true);
    try {
      const { call: updated } = await engineerCallsApi.submitWarrantyCheck(call._id, {
        hasBill,
        dateOfPurchase: purchaseIso ?? undefined,
        billNumber: hasBill ? billNumber.trim() : undefined,
        dealerName: hasBill ? dealerName.trim() : undefined,
      });
      onUpdated(updated);
      setRecheckingWarranty(false);
    } catch (err) {
      setWarrantyError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not record the warranty check.'));
    } finally {
      setWarrantyBusy(false);
    }
  };

  const productPhoto = imageOf('product');
  const nameplatePhoto = imageOf('nameplate');
  const billPhoto = imageOf('bill');

  const summary = call.warrantyStatus
    ? WARRANTY_LABEL[call.warrantyStatus]
    : productPhoto && nameplatePhoto
      ? 'Photos captured — warranty not checked yet'
      : 'Tap to photograph the unit and check warranty';

  return (
    <CollapsibleSection title="Check SR" summary={summary}>
      <Text style={[typography.caption, styles.subtitle]}>
        Photograph the unit and its serial number, and correct any details below before starting work.
      </Text>

      <View style={styles.photoRow}>
        <PhotoSlot label="Product photo" required existingUrl={productPhoto?.secure_url} busy={photoBusy === 'product'} onCapture={() => capturePhoto('product')} />
        <PhotoSlot label="Serial number" required existingUrl={nameplatePhoto?.secure_url} busy={photoBusy === 'nameplate'} onCapture={() => capturePhoto('nameplate')} />
      </View>

      <ProductVideoSlot call={call} onUpdated={onUpdated} />
      {photoError ? <Notice tone="warning" message={photoError} /> : null}

      <View style={styles.fields}>
        <TextField label="Brand" value={brandName} onChangeText={setBrandName} placeholder="From the nameplate" />
        <TextField label="Product type" value={productsName} onChangeText={setProductsName} />
        <IdentityField call={call} field="modelNumber" value={modelNumber} onChangeText={setModelNumber} />
        <IdentityField call={call} field="serialNumber" value={serialNumber} onChangeText={setSerialNumber} />
        <IdentityField call={call} field="iduser" value={iduser} onChangeText={setIduser} />
        <IdentityField call={call} field="oduser" value={oduser} onChangeText={setOduser} />
        <TextField label="Capacity / tonnage" value={capacity} onChangeText={setCapacity} placeholder="e.g. 1.5T" />
      </View>

      {detailsError ? <Notice tone="error" message={detailsError} /> : null}
      {detailsSaved ? <Notice tone="success" message="Product details saved." /> : null}
      <Button label="Save product details" loadingLabel="Saving…" onPress={saveDetails} loading={savingDetails} variant="secondary" />

      <View style={styles.divider} />

      <Text style={[typography.bodyStrong, styles.title]}>Warranty</Text>

      {call.warrantyStatus && !recheckingWarranty ? (
        <>
        <Notice
          tone={WARRANTY_TONE[call.warrantyStatus]}
          message={WARRANTY_LABEL[call.warrantyStatus]}
          action={[warrantyReason(call), call.warrantyCheckedAt ? `Checked ${new Date(call.warrantyCheckedAt).toLocaleString()}` : '']
            .filter(Boolean)
            .join(' · ') || undefined}
        />
          <Button
            label="Check again"
            variant="ghost"
            onPress={() => {
              setHasBill(null);
              setWarrantyError(null);
              setRecheckingWarranty(true);
            }}
          />
        </>
      ) : (
        <>
          <Text style={[typography.caption, styles.subtitle]}>
            A purchase bill is required for any warranty claim — without one the job is chargeable.
          </Text>

          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => setHasBill(true)}
              style={[styles.toggleButton, hasBill === true && styles.toggleButtonActive]}
            >
              <Text style={[typography.small, hasBill === true ? styles.toggleTextActive : styles.toggleText]}>Has a bill</Text>
            </Pressable>
            <Pressable
              onPress={() => setHasBill(false)}
              style={[styles.toggleButton, hasBill === false && styles.toggleButtonActive]}
            >
              <Text style={[typography.small, hasBill === false ? styles.toggleTextActive : styles.toggleText]}>No bill</Text>
            </Pressable>
          </View>

          {hasBill ? (
            <>
              <PhotoSlot label="Purchase bill" existingUrl={billPhoto?.secure_url || undefined} savedPrivately={Boolean(billPhoto)} busy={photoBusy === 'bill'} onCapture={() => capturePhoto('bill')} />
              <TextField label="Date of purchase (DD/MM/YYYY)" value={dateOfPurchase} onChangeText={setDateOfPurchase} placeholder="28/02/2025" keyboardType="numbers-and-punctuation" />
              <TextField label="Bill number" value={billNumber} onChangeText={setBillNumber} />
              <TextField label="Dealer / seller name" value={dealerName} onChangeText={setDealerName} />
            </>
          ) : null}

          {hasBill !== null ? (
            <>
              {warrantyError ? <Notice tone="error" message={warrantyError} /> : null}
              <Button label="Submit warranty check" loadingLabel="Checking…" onPress={submitWarranty} loading={warrantyBusy} />
            </>
          ) : null}
          {recheckingWarranty ? (
            <Button label="Cancel — keep the current result" variant="ghost" onPress={() => setRecheckingWarranty(false)} />
          ) : null}
        </>
      )}
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  lockedField: {
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  lockedLabel: {
    color: colors.textMuted,
  },
  lockedValue: {
    color: colors.text,
  },
  lockedHint: {
    color: colors.textFaint,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoSlot: {
    flex: 1,
    gap: spacing.xs,
  },
  photoLabel: {
    color: colors.textMuted,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 1.3,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
  },
  photoPlaceholder: {
    width: '100%',
    aspectRatio: 1.3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    color: colors.textFaint,
  },
  photoButton: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  photoButtonPressed: {
    opacity: 0.75,
  },
  photoButtonDisabled: {
    opacity: 0.5,
  },
  photoButtonText: {
    color: colors.brand,
    fontWeight: '700',
  },
  fields: {
    gap: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  toggleText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
});
