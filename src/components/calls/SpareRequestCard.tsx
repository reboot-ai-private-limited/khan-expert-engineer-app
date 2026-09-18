import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { spareRequestsApi, type ServiceItemOption } from '@/api/endpoints/spareRequests';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerCall } from '@/types/call';
import { isSpareRequestTerminal, SPARE_REQUEST_STATUS_LABEL, type SpareRequest, type SpareRequestUrgency } from '@/types/spareRequest';

interface SpareRequestCardProps {
  call: EngineerCall;
  onCallUpdated: (call: EngineerCall) => void;
}

const URGENCY_OPTIONS: { value: SpareRequestUrgency; label: string }[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'today', label: 'Today' },
  { value: 'next_visit', label: 'Next visit' },
];

/**
 * Raise a spare-parts shortage from the job, or track/confirm one already
 * raised — mobile/docs/specs/07-spare-parts.md. Only one open request per
 * job matters here; the cross-job "My spare requests" list is a separate
 * screen, not built yet.
 */
export const SpareRequestCard: React.FC<SpareRequestCardProps> = ({ call, onCallUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<SpareRequest | null>(null);

  const [itemQuery, setItemQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ServiceItemOption[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState('1');
  const [urgency, setUrgency] = useState<SpareRequestUrgency>('today');
  const [reason, setReason] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [customerWaiting, setCustomerWaiting] = useState(false);

  const [raising, setRaising] = useState(false);
  const [raiseError, setRaiseError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    spareRequestsApi
      .getMine()
      .then((requests) => {
        if (cancelled) return;
        const forThisJob = requests
          .filter((r) => r.callNumber === call.callNumber)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActiveRequest(forThisJob[0] ?? null);
      })
      .catch(() => {
        // Not critical enough to block the job screen — the raise form still works.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [call.callNumber]);

  useEffect(() => {
    if (selectedItemId || itemQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      spareRequestsApi
        .searchItems(itemQuery.trim())
        .then((items) => {
          if (!cancelled) setSuggestions(items.slice(0, 5));
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [itemQuery, selectedItemId]);

  const pickSuggestion = (item: ServiceItemOption) => {
    setSelectedItemId(item._id);
    setItemQuery(item.name);
    setSuggestions([]);
  };

  const handleItemQueryChange = (text: string) => {
    setItemQuery(text);
    setSelectedItemId(undefined);
  };

  const raise = async () => {
    setRaiseError(null);
    if (!itemQuery.trim()) {
      setRaiseError('Enter or select an item.');
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty < 1) {
      setRaiseError('Quantity must be at least 1.');
      return;
    }
    if (!reason.trim()) {
      setRaiseError('Explain what failed and why this part is needed.');
      return;
    }

    setRaising(true);
    try {
      const { request, call: updatedCall } = await spareRequestsApi.raise(call._id, {
        itemId: selectedItemId,
        itemName: itemQuery.trim(),
        isFreeText: !selectedItemId,
        quantity: qty,
        urgency,
        reason: reason.trim(),
        partNumber: partNumber.trim() || undefined,
        customerWaiting,
      });
      setActiveRequest(request);
      onCallUpdated(updatedCall);
    } catch (err) {
      setRaiseError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not raise the request.'));
    } finally {
      setRaising(false);
    }
  };

  const confirmReceipt = async () => {
    if (!activeRequest) return;
    setConfirmError(null);
    setConfirming(true);
    try {
      const { request, call: updatedCall } = await spareRequestsApi.confirmReceipt(activeRequest._id);
      setActiveRequest(request);
      onCallUpdated(updatedCall);
    } catch (err) {
      setConfirmError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not confirm receipt.'));
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={colors.brand} />
      </View>
    );
  }

  const showStatus = activeRequest && !isSpareRequestTerminal(activeRequest.status);
  const needsAttention = Boolean(showStatus && activeRequest!.status === 'dispatched');

  const summary = showStatus
    ? `${activeRequest!.itemName} — ${SPARE_REQUEST_STATUS_LABEL[activeRequest!.status]}`
    : activeRequest
      ? `Last request: ${activeRequest.itemName} — ${SPARE_REQUEST_STATUS_LABEL[activeRequest.status]}`
      : 'Tap to raise a request if you need a part';

  return (
    <CollapsibleSection title="Spare parts" summary={summary} defaultExpanded={needsAttention}>
      {activeRequest && !showStatus && (
        <Text style={[typography.caption, styles.subtitle]}>
          Last request for this job: “{activeRequest.itemName}” — {SPARE_REQUEST_STATUS_LABEL[activeRequest.status]}.
        </Text>
      )}

      {showStatus ? (
        <View style={styles.statusBox}>
          <View style={styles.statusHeader}>
            <Text style={[typography.bodyStrong, styles.statusItem]}>
              {activeRequest!.itemName} × {activeRequest!.quantity}
            </Text>
            <View style={styles.statusPill}>
              <Text style={[typography.caption, styles.statusPillText]}>{activeRequest!.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={[typography.small, styles.statusMessage]}>{SPARE_REQUEST_STATUS_LABEL[activeRequest!.status]}</Text>
          {activeRequest!.status === 'rejected' && activeRequest!.rejectionReason ? (
            <Text style={[typography.caption, styles.statusReason]}>Reason: {activeRequest!.rejectionReason}</Text>
          ) : null}
          {activeRequest!.status === 'dispatched' ? (
            <>
              {confirmError ? <Notice tone="error" message={confirmError} /> : null}
              <Button label="Confirm I received it" loadingLabel="Confirming…" onPress={confirmReceipt} loading={confirming} />
            </>
          ) : null}
        </View>
      ) : (
        <>
          <Text style={[typography.caption, styles.subtitle]}>Opened the unit and don't have the part you need? Raise a request.</Text>

          <View style={styles.itemField}>
            <TextField label="Item" value={itemQuery} onChangeText={handleItemQueryChange} placeholder="Search or type an item name" />
            {suggestions.length > 0 && (
              <View style={styles.suggestionBox}>
                {suggestions.map((s) => (
                  <Pressable key={s._id} onPress={() => pickSuggestion(s)} style={styles.suggestionRow}>
                    <Text style={[typography.small, styles.suggestionText]}>{s.name}</Text>
                    {s.currentStock !== undefined && (
                      <Text style={[typography.caption, styles.suggestionStock]}>{s.currentStock} in stock</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
            {!selectedItemId && itemQuery.trim().length > 1 && suggestions.length === 0 ? (
              <Text style={[typography.caption, styles.freeTextHint]}>Not in the list — this will flag the item master as incomplete.</Text>
            ) : null}
          </View>

          <TextField label="Quantity" value={quantity} onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />

          <View style={styles.urgencyRow}>
            {URGENCY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setUrgency(opt.value)}
                style={[styles.urgencyButton, urgency === opt.value && styles.urgencyButtonActive]}
              >
                <Text style={[typography.small, urgency === opt.value ? styles.urgencyTextActive : styles.urgencyText]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="What failed, and why this part" multiline numberOfLines={3} />
          <TextField label="Part number (optional)" value={partNumber} onChangeText={setPartNumber} />

          <Pressable onPress={() => setCustomerWaiting((v) => !v)} style={styles.waitingRow}>
            <View style={[styles.checkbox, customerWaiting && styles.checkboxActive]}>
              {customerWaiting ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={[typography.small, styles.waitingText]}>Customer is waiting on site</Text>
          </Pressable>

          {raiseError ? <Notice tone="error" message={raiseError} /> : null}
          <Button label="Raise spare request" loadingLabel="Sending…" onPress={raise} loading={raising} variant="secondary" />
        </>
      )}
    </CollapsibleSection>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
  },
  itemField: {
    position: 'relative',
  },
  suggestionBox: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  suggestionText: {
    color: colors.text,
  },
  suggestionStock: {
    color: colors.textFaint,
  },
  freeTextHint: {
    color: colors.textFaint,
    marginTop: spacing.xs,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  urgencyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  urgencyButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  urgencyText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  urgencyTextActive: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  checkmark: {
    color: colors.textOnBrand,
    fontSize: 13,
    fontWeight: '700',
  },
  waitingText: {
    color: colors.text,
  },
  statusBox: {
    gap: spacing.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItem: {
    color: colors.text,
    flex: 1,
  },
  statusPill: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusPillText: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
  statusMessage: {
    color: colors.textMuted,
  },
  statusReason: {
    color: colors.danger,
  },
});
