import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/common/Button';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { capturePhoto } from '@/utils/imageCapture';
import { captureIntent } from '@/services/storage/captureIntent';
import { usePendingCapture } from '@/hooks/usePendingCapture';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerCall, SelfPurchasedPart } from '@/types/call';

interface SelfPurchaseCardProps {
  call: EngineerCall;
  onUpdated: (updated: EngineerCall) => void;
  /** Set when this purchase replaces a request the office was too slow to fill. */
  spareRequestId?: string;
}

const money = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * A part the engineer bought out of their own pocket at a nearby shop.
 *
 * Two amounts on purpose: what they paid (reimbursed to them once the office
 * approves) and what the customer is charged (added to the bill immediately,
 * so a part can never be fitted without being billed). The shop bill photo is
 * mandatory — it is the only evidence behind the reimbursement.
 */
export const SelfPurchaseCard: React.FC<SelfPurchaseCardProps> = ({ call, onUpdated, spareRequestId }) => {
  const purchases = call.selfPurchasedParts ?? [];

  const [adding, setAdding] = useState(false);
  const [partName, setPartName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [amountPaid, setAmountPaid] = useState('');
  const [customerPrice, setCustomerPrice] = useState('');
  const [shopName, setShopName] = useState('');
  const [billUri, setBillUri] = useState<string | null>(null);
  const [billData, setBillData] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A bill photo taken while the app was killed comes back here, and the
  // form reopens so the engineer can finish the purchase they started.
  usePendingCapture('part-bill', call._id, (dataUri) => {
    setAdding(true);
    setBillUri(dataUri);
    setBillData(dataUri);
  });

  const takeBillPhoto = async () => {
    try {
      await captureIntent.set({ purpose: 'part-bill', callId: call._id });
      const photo = await capturePhoto();
      await captureIntent.clear();
      if (!photo) return;
      setError(null);
      setBillUri(photo.uri);
      setBillData(photo.dataUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not take that photo.');
    }
  };

  const reset = () => {
    setPartName('');
    setQuantity('1');
    setAmountPaid('');
    setCustomerPrice('');
    setShopName('');
    setBillUri(null);
    setBillData(null);
    setAdding(false);
    setError(null);
  };

  const submit = async () => {
    if (saving) return;
    setError(null);

    if (!partName.trim()) {
      setError('Name the part you bought.');
      return;
    }
    const paid = Number(amountPaid);
    if (!amountPaid.trim() || !Number.isFinite(paid) || paid < 0) {
      setError('Enter what you paid for it.');
      return;
    }
    if (!billData) {
      setError('Take a photo of the shop bill.');
      return;
    }

    setSaving(true);
    try {
      const updated = await engineerCallsApi.recordSelfPurchase(call._id, {
        partName: partName.trim(),
        quantity: Math.max(1, Number(quantity) || 1),
        amountPaid: paid,
        customerPrice: customerPrice.trim() ? Number(customerPrice) : undefined,
        shopName: shopName.trim() || undefined,
        spareRequestId,
        billPhotoBase64: billData,
      });
      onUpdated(updated);
      reset();
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? 'Could not record the purchase.')
      );
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = purchases.filter((p) => p.status === 'pending').length;
  const summary = purchases.length === 0
    ? 'Nothing bought yet'
    : pendingCount > 0
      ? `${purchases.length} bought · ${pendingCount} awaiting approval`
      : `${purchases.length} bought`;

  return (
    <CollapsibleSection title="Parts you bought yourself" summary={summary} defaultExpanded={purchases.length === 0}>
      <View style={styles.block}>
        {purchases.map((purchase) => (
          <PurchaseRow key={purchase._id} purchase={purchase} />
        ))}

        {adding ? (
          <View style={styles.form}>
            <TextField
              label="What did you buy?"
              value={partName}
              onChangeText={setPartName}
              placeholder="e.g. Capacitor 45uF"
            />
            <TextField
              label="Quantity"
              value={quantity}
              onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
            />
            <TextField
              label="What you paid (₹)"
              value={amountPaid}
              onChangeText={(t) => setAmountPaid(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              hint="Reimbursed to you once the office approves"
            />
            <TextField
              label="Charge the customer (₹)"
              value={customerPrice}
              onChangeText={(t) => setCustomerPrice(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              hint="Added to the bill. Leave blank if the customer is not charged."
            />
            <TextField label="Shop name" value={shopName} onChangeText={setShopName} placeholder="Optional" />

            <View style={styles.photoBlock}>
              <Text style={[typography.label, styles.photoLabel]}>Shop bill photo *</Text>
              {billUri ? (
                <Pressable onPress={() => void takeBillPhoto()} accessibilityRole="button" accessibilityLabel="Retake bill photo">
                  <Image source={{ uri: billUri }} style={styles.bill} />
                  <Text style={[typography.caption, styles.retake]}>Tap to retake</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => void takeBillPhoto()}
                  accessibilityRole="button"
                  accessibilityLabel="Photograph the shop bill"
                  style={({ pressed }) => [styles.captureBox, pressed && styles.capturePressed]}
                >
                  <Ionicons name="camera" size={22} color={colors.brand} />
                  <Text style={[typography.caption, styles.captureText]}>Photograph the bill</Text>
                </Pressable>
              )}
            </View>

            {error ? <Notice tone="error" message={error} /> : null}

            <View style={styles.actions}>
              <Button label="Cancel" variant="secondary" onPress={reset} style={styles.actionButton} />
              <Button
                label="Save purchase"
                loadingLabel="Saving…"
                onPress={submit}
                loading={saving}
                style={styles.actionButton}
              />
            </View>
          </View>
        ) : (
          <>
            <Text style={[typography.small, styles.intro]}>
              Bought a part at a shop with your own money? Record it here with the bill and the office will pay you
              back.
            </Text>
            <Button label="I bought a part" variant="secondary" onPress={() => setAdding(true)} />
          </>
        )}
      </View>
    </CollapsibleSection>
  );
};

const PurchaseRow: React.FC<{ purchase: SelfPurchasedPart }> = ({ purchase }) => {
  const tone =
    purchase.status === 'approved' ? styles.badgeApproved : purchase.status === 'declined' ? styles.badgeDeclined : styles.badgePending;

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={[typography.bodyStrong, styles.rowTitle]} numberOfLines={1}>
          {purchase.partName}
          {purchase.quantity > 1 ? ` ×${purchase.quantity}` : ''}
        </Text>
        <View style={[styles.badge, tone]}>
          <Text style={[typography.caption, styles.badgeText]}>{purchase.status}</Text>
        </View>
      </View>

      <Text style={[typography.caption, styles.rowMeta]}>
        You paid {money(purchase.amountPaid * purchase.quantity)}
        {purchase.customerPrice ? ` · customer billed ${money(purchase.customerPrice * purchase.quantity)}` : ''}
        {purchase.shopName ? ` · ${purchase.shopName}` : ''}
      </Text>

      {purchase.status === 'approved' ? (
        <Text style={[typography.caption, styles.rowGood]}>Reimbursed to your wallet.</Text>
      ) : purchase.status === 'declined' ? (
        <Text style={[typography.caption, styles.rowBad]}>{purchase.decisionNote || 'Not reimbursed.'}</Text>
      ) : (
        <Text style={[typography.caption, styles.rowMeta]}>Waiting for the office to approve.</Text>
      )}

      {purchase.billPhotoUrl ? <Image source={{ uri: purchase.billPhotoUrl }} style={styles.billThumb} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  intro: { color: colors.textMuted },
  form: { gap: spacing.lg },
  photoBlock: { gap: spacing.sm },
  photoLabel: { color: colors.textMuted },
  captureBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.sunken,
  },
  capturePressed: { opacity: 0.75 },
  captureText: { color: colors.brand, fontWeight: '700' },
  bill: { width: '100%', height: 160, borderRadius: radius.md, backgroundColor: colors.sunken },
  billThumb: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.sunken },
  retake: { color: colors.textFaint, textAlign: 'center', marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionButton: { flex: 1 },
  row: {
    gap: spacing.xs,
    backgroundColor: colors.sunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { color: colors.text, flex: 1 },
  rowMeta: { color: colors.textMuted },
  rowGood: { color: colors.success, fontWeight: '700' },
  rowBad: { color: colors.warning },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 1 },
  badgePending: { backgroundColor: colors.warningWash },
  badgeApproved: { backgroundColor: colors.successWash },
  badgeDeclined: { backgroundColor: colors.dangerWash },
  badgeText: { fontWeight: '700', textTransform: 'capitalize', color: colors.text },
});
