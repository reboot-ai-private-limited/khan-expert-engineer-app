import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { walletApi } from '@/api/endpoints/wallet';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import {
  WALLET_ENTRY_LABEL,
  WALLET_REMARK_LABEL,
  type WalletEntry,
} from '@/types/wallet';

const formatMoney = (n: number) => `₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [settling, setSettling] = useState(false);
  const [settleMode, setSettleMode] = useState<'cash' | 'upi' | null>(null);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleReference, setSettleReference] = useState('');
  const [settleNote, setSettleNote] = useState('');
  const [settleBusy, setSettleBusy] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSuccess, setSettleSuccess] = useState(false);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [bal, tx] = await Promise.all([walletApi.getBalance(), walletApi.getTransactions()]);
      setBalance(bal.balance);
      setEntries(tx);
    } catch (err) {
      setLoadError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not load your wallet.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const pendingPayouts = entries.filter((e) => e.type === 'settlement_paid_to_engineer' && e.status === 'pending');

  const confirmPayout = async (entryId: string) => {
    setConfirmingId(entryId);
    try {
      await walletApi.confirmPayoutReceipt(entryId);
      await load();
    } catch (err) {
      setLoadError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not confirm receipt.'));
    } finally {
      setConfirmingId(null);
    }
  };

  const openSettle = () => {
    setSettleMode(null);
    setSettleAmount(balance !== null && balance < 0 ? String(Math.abs(Math.round(balance))) : '');
    setSettleReference('');
    setSettleNote('');
    setSettleError(null);
    setSettleSuccess(false);
    setQrUri(null);
    setSettling(true);
  };

  const pickMode = async (mode: 'cash' | 'upi') => {
    setSettleMode(mode);
    setQrUri(null);
    if (mode === 'upi') {
      setQrLoading(true);
      try {
        const { upiUri } = await walletApi.getPaymentQr(Number(settleAmount) || undefined, `Settlement ${new Date().toISOString().slice(0, 10)}`);
        setQrUri(upiUri);
      } catch {
        // The engineer can still settle by cash if the QR can't load — not a hard blocker.
      } finally {
        setQrLoading(false);
      }
    }
  };

  const submitSettle = async () => {
    setSettleError(null);
    const amt = Number(settleAmount);
    if (!settleMode) {
      setSettleError('Choose cash or UPI.');
      return;
    }
    if (!amt || amt <= 0) {
      setSettleError('Enter a valid amount.');
      return;
    }

    setSettleBusy(true);
    try {
      await walletApi.settle(
        amt,
        settleMode,
        settleReference.trim() || undefined,
        undefined,
        settleNote.trim() || undefined
      );
      setSettleSuccess(true);
      await load();
    } catch (err) {
      setSettleError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not submit the settlement.'));
    } finally {
      setSettleBusy(false);
    }
  };

  const owesCompany = balance !== null && balance < 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>Wallet</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.brand} style={styles.loader} />
        ) : (
          <>
            {loadError ? <Notice tone="error" message={loadError} /> : null}

            <View style={[styles.balanceCard, owesCompany ? styles.balanceCardOwe : styles.balanceCardReceive]}>
              <Text style={[typography.caption, styles.balanceLabel]}>{balance === 0 ? 'Nothing outstanding' : owesCompany ? 'You owe the office' : 'The office owes you'}</Text>
              <Text style={[typography.display, styles.balanceAmount]}>{balance !== null ? formatMoney(balance) : '—'}</Text>
              <Text style={[typography.caption, styles.balanceHint]}>
                {balance === 0
                  ? 'You are all square with the office.'
                  : owesCompany
                    ? 'Settle this with the office.'
                    : 'The office will pay this to you.'}
              </Text>
            </View>

            {pendingPayouts.length > 0 && (
              <View style={styles.section}>
                <Text style={[typography.label, styles.sectionLabel]}>Awaiting your confirmation</Text>
                {pendingPayouts.map((p) => (
                  <View key={p._id} style={styles.payoutRow}>
                    <View style={styles.payoutInfo}>
                      <Text style={[typography.bodyStrong, styles.payoutAmount]}>{formatMoney(p.amount)}</Text>
                      <Text style={[typography.caption, styles.payoutNote]}>
                        Payout via {p.paymentMode || 'bank transfer'}
                        {p.reference ? ` · ${p.reference}` : ''}
                      </Text>
                    </View>
                    <Button
                      label="Confirm received"
                      loadingLabel="Confirming…"
                      onPress={() => confirmPayout(p._id)}
                      loading={confirmingId === p._id}
                    />
                  </View>
                ))}
              </View>
            )}

            {!settling ? (
              <Button label="Settle" onPress={openSettle} variant="secondary" />
            ) : (
              <View style={styles.settleBox}>
                <Text style={[typography.bodyStrong, styles.settleTitle]}>Settle with the office</Text>

                {settleSuccess ? (
                  <>
                    <Notice tone="success" message="Settlement submitted. The office will confirm receipt, then your balance updates." />
                    <Button label="Done" variant="secondary" onPress={() => setSettling(false)} />
                  </>
                ) : (
                  <>
                    <TextField label="Amount (₹)" value={settleAmount} onChangeText={(t) => setSettleAmount(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />

                    <View style={styles.modeRow}>
                      <Pressable onPress={() => pickMode('cash')} style={[styles.modeButton, settleMode === 'cash' && styles.modeButtonActive]}>
                        <Text style={[typography.small, settleMode === 'cash' ? styles.modeTextActive : styles.modeText]}>Cash at office</Text>
                      </Pressable>
                      <Pressable onPress={() => pickMode('upi')} style={[styles.modeButton, settleMode === 'upi' && styles.modeButtonActive]}>
                        <Text style={[typography.small, settleMode === 'upi' ? styles.modeTextActive : styles.modeText]}>UPI</Text>
                      </Pressable>
                    </View>

                    <TextField
                      label="Remark (optional)"
                      value={settleNote}
                      onChangeText={setSettleNote}
                      placeholder="Anything the office should know"
                      multiline
                    />

                    {settleMode === 'upi' ? (
                      <View style={styles.qrBox}>
                        {qrLoading ? (
                          <ActivityIndicator size="small" color={colors.brand} />
                        ) : qrUri ? (
                          <>
                            <QRCode value={qrUri} size={180} color={colors.text} backgroundColor={colors.surface} />
                            <Text style={[typography.caption, styles.qrHint]}>Scan to pay the company directly, then enter the reference below.</Text>
                          </>
                        ) : (
                          <Text style={[typography.caption, styles.qrHint]}>QR unavailable right now — you can still settle by cash.</Text>
                        )}
                        <TextField label="UPI reference (optional)" value={settleReference} onChangeText={setSettleReference} placeholder="Txn ID" />
                      </View>
                    ) : null}

                    {settleError ? <Notice tone="error" message={settleError} /> : null}

                    <View style={styles.settleActions}>
                      <Button label="Cancel" variant="secondary" onPress={() => setSettling(false)} style={styles.settleActionButton} />
                      <Button label="Submit" loadingLabel="Submitting…" onPress={submitSettle} loading={settleBusy} style={styles.settleActionButton} />
                    </View>
                  </>
                )}
              </View>
            )}

            <View style={styles.section}>
              <Text style={[typography.label, styles.sectionLabel]}>Transaction history</Text>
              {entries.length === 0 ? (
                <Text style={[typography.caption, styles.emptyText]}>Nothing recorded yet.</Text>
              ) : (
                entries.map((e) => (
                  <View key={e._id} style={styles.txRow}>
                    <View style={styles.txInfo}>
                      <Text style={[typography.small, styles.txLabel]}>{WALLET_ENTRY_LABEL[e.type]}</Text>
                      {e.remark ? (
                        <View style={styles.txRemark}>
                          <Text style={[typography.caption, styles.txRemarkText]}>
                            {WALLET_REMARK_LABEL[e.remark]}
                          </Text>
                        </View>
                      ) : null}
                      <Text style={[typography.caption, styles.txMeta]}>
                        {e.callNumber ? `Job ${e.callNumber} · ` : ''}
                        {new Date(e.createdAt).toLocaleDateString()}
                        {e.status !== 'confirmed' ? ` · ${e.status}` : ''}
                      </Text>
                      {e.note ? <Text style={[typography.caption, styles.txNote]}>{e.note}</Text> : null}
                    </View>
                    <Text style={[typography.bodyStrong, e.amount >= 0 ? styles.txAmountPositive : styles.txAmountNegative]}>
                      {e.amount >= 0 ? '+' : '-'}
                      {formatMoney(e.amount)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  backArrow: {
    fontSize: 24,
    color: colors.brand,
    fontWeight: '700',
  },
  headerTitle: {
    color: colors.text,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  loader: {
    marginTop: spacing.xxxl,
  },
  balanceCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  balanceCardOwe: {
    backgroundColor: colors.warningWash,
  },
  balanceCardReceive: {
    backgroundColor: colors.successWash,
  },
  balanceLabel: {
    color: colors.textMuted,
  },
  balanceAmount: {
    color: colors.text,
  },
  balanceHint: {
    color: colors.textMuted,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutAmount: {
    color: colors.text,
  },
  payoutNote: {
    color: colors.textMuted,
  },
  settleBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  settleTitle: {
    color: colors.text,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modeButtonActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  modeText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  modeTextActive: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
  qrBox: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  qrHint: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  settleActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  settleActionButton: {
    flex: 1,
  },
  emptyText: {
    color: colors.textFaint,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  txInfo: {
    flex: 1,
  },
  txLabel: {
    color: colors.text,
    fontWeight: '600',
  },
  txMeta: {
    color: colors.textFaint,
    marginTop: 2,
  },
  txNote: {
    color: colors.textMuted,
    marginTop: 2,
  },
  txRemark: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandWash,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    marginTop: 2,
  },
  txRemarkText: {
    color: colors.brand,
    fontWeight: '700',
  },
  txAmountPositive: {
    color: colors.success,
  },
  txAmountNegative: {
    color: colors.danger,
  },
});
