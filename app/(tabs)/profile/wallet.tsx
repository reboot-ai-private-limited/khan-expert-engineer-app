import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { walletApi } from '@/api/endpoints/wallet';
import { dismissedNotices } from '@/services/storage/dismissedNotices';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { SelectField } from '@/components/common/SelectField';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import {
  ADVANCE_STATUS_LABEL,
  WALLET_ENTRY_LABEL,
  WALLET_REMARK_LABEL,
  REQUESTABLE_CATEGORIES,
  WALLET_REQUEST_CATEGORY_LABEL,
  type AdvanceSummary,
  type WalletEntry,
  type WalletRequest,
  type WalletRequestCategory,
} from '@/types/wallet';

const formatMoney = (n: number) => `₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;

export default function WalletScreen() {
  const insets = useSafeAreaInsets();

  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<WalletEntry[]>([]);
  const [requests, setRequests] = useState<WalletRequest[]>([]);
  const [advances, setAdvances] = useState<AdvanceSummary[]>([]);
  /** Wallet notices the engineer closed — see services/storage/dismissedNotices.ts. */
  const [dismissed, setDismissed] = useState<string[]>([]);
  /** False when the server has no advances endpoint yet (not updated). */
  const [advancesAvailable, setAdvancesAvailable] = useState(true);
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

  const [requesting, setRequesting] = useState(false);
  const [requestCategory, setRequestCategory] = useState<WalletRequestCategory>('advance');
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [bal, tx, reqs] = await Promise.all([
        walletApi.getBalance(),
        walletApi.getTransactions(),
        walletApi.getMyRequests(),
      ]);
      setBalance(bal.balance);
      setEntries(tx);
      setRequests(reqs);
      setDismissed(await dismissedNotices.get());
      // Separate, and allowed to fail: an older server has no advances
      // endpoint, and that must not take the rest of the wallet down with it.
      try {
        setAdvances(await walletApi.getAdvances());
        setAdvancesAvailable(true);
      } catch {
        setAdvances([]);
        setAdvancesAvailable(false);
      }
    } catch (err) {
      setLoadError(isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? 'Could not load your wallet.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // On every return to this screen, not just the first mount — coming back
  // from an expense advance must show its new totals and the new balance.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const pendingPayouts = entries.filter((e) => e.type === 'settlement_paid_to_engineer' && e.status === 'pending');
  // Settlements the office turned down in the last week — surfaced on top so
  // the engineer knows to settle again, not buried in the history.
  // Hidden once dismissed, or once the engineer has settled again since —
  // by then the warning has done its job.
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lastSettlementAt = Math.max(
    0,
    ...entries
      .filter((e) => e.type === 'settlement_paid_by_engineer' && (e.status === 'pending' || e.status === 'confirmed'))
      .map((e) => new Date(e.createdAt).getTime())
  );
  const rejectedSettlements = entries
    .filter((e) => {
      if (e.type !== 'settlement_paid_by_engineer' || e.status !== 'rejected') return false;
      const at = new Date(e.createdAt).getTime();
      return at > weekAgo && at > lastSettlementAt && !dismissed.includes(e._id);
    })
    .slice(0, 3);

  const dismissNotice = async (id: string) => {
    setDismissed((prev) => [...prev, id]);
    setDismissed(await dismissedNotices.add(id));
  };

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

  // A pending expense advance shows under Expense advances instead.
  const pendingRequests = requests.filter((r) => r.status === 'pending' && r.category !== 'expense_advance');
  // Only the most recent few — a declined request is a one-time notice, not
  // something worth scrolling past for weeks. Approved ones need no notice
  // here at all: the ledger entry they became is right below in the
  // transaction history.
  const recentlyDeclined = requests.filter((r) => r.status === 'declined').slice(0, 3);
  // Open ones first — they are the ones waiting on the engineer.
  const advanceOrder = { open: 0, submitted: 1, settled: 2 } as const;
  const approvedAdvances = advances
    // A settled one can be closed with its ✕ — its result is also in the history.
    .filter((a) => a.request.settlementStatus && !(a.request.settlementStatus === 'settled' && dismissed.includes(a.request._id)))
    .sort((a, b) => advanceOrder[a.request.settlementStatus!] - advanceOrder[b.request.settlementStatus!])
    .slice(0, 5);
  const pendingAdvance = advances.find((a) => a.request.status === 'pending' && a.request.category === 'expense_advance')?.request;

  const openRequest = () => {
    setRequestCategory('advance');
    setRequestAmount('');
    setRequestReason('');
    setRequestError(null);
    setRequestSuccess(false);
    setRequesting(true);
  };

  const isClaim = requestCategory === 'expense_claim';

  const submitRequest = async () => {
    setRequestError(null);
    // A claim has no amount — its expenses are the amount.
    const amt = isClaim ? 0 : Number(requestAmount);
    if (!isClaim && (!amt || amt <= 0)) {
      setRequestError('Enter a valid amount.');
      return;
    }
    if (!requestReason.trim()) {
      setRequestError(isClaim ? 'Say what this claim is for.' : 'Tell the office what this is for.');
      return;
    }

    setRequestBusy(true);
    try {
      const created = await walletApi.requestPayment(requestCategory, amt, requestReason.trim());
      if (isClaim) {
        // Nothing to wait for — go straight to adding expenses.
        setRequesting(false);
        router.push({ pathname: '/(tabs)/profile/advance', params: { requestId: created._id } });
        return;
      }
      setRequestSuccess(true);
      await load();
    } catch (err) {
      setRequestError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? 'Could not submit the request.')
      );
    } finally {
      setRequestBusy(false);
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

            {rejectedSettlements.map((e) => (
              <Notice
                key={e._id}
                tone="warning"
                message={`Your settlement of ${formatMoney(e.amount)} was rejected${e.rejectionNote ? `: ${e.rejectionNote}` : '.'}`}
                action="Your balance did not change. Check the details and settle again."
                onDismiss={() => void dismissNotice(e._id)}
              />
            ))}

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

            {!settling && !requesting ? (
              <View style={styles.settleActions}>
                <Button label="Settle" onPress={openSettle} variant="secondary" style={styles.settleActionButton} />
                <Button label="Request money" onPress={openRequest} variant="secondary" style={styles.settleActionButton} />
              </View>
            ) : settling ? (
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
            ) : (
              <View style={styles.settleBox}>
                <Text style={[typography.bodyStrong, styles.settleTitle]}>Request money from the office</Text>

                {requestSuccess ? (
                  <>
                    <Notice tone="success" message="Request sent. The office will review it and let you know." />
                    <Button label="Done" variant="secondary" onPress={() => setRequesting(false)} />
                  </>
                ) : (
                  <>
                    <SelectField
                      label="What is this for?"
                      value={WALLET_REQUEST_CATEGORY_LABEL[requestCategory]}
                      options={REQUESTABLE_CATEGORIES.map((cat) => WALLET_REQUEST_CATEGORY_LABEL[cat])}
                      onChange={(label) => {
                        const match = REQUESTABLE_CATEGORIES.find((cat) => WALLET_REQUEST_CATEGORY_LABEL[cat] === label);
                        if (match) setRequestCategory(match);
                      }}
                    />

                    {!isClaim ? (
                      <TextField
                        label="Amount (₹)"
                        value={requestAmount}
                        onChangeText={(t) => setRequestAmount(t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                    ) : null}

                    {requestCategory === 'expense_advance' ? (
                      <Text style={[typography.caption, styles.payoutNote]}>
                        Money up front for travel, food or other job costs. Afterwards you add what you spent, with
                        receipts, and the office settles the rest.
                      </Text>
                    ) : null}
                    {isClaim ? (
                      <Text style={[typography.caption, styles.payoutNote]}>
                        Paid for travel, food or other job costs yourself? Start a claim, add each expense with a
                        receipt, and submit it. The office pays what it approves into your wallet.
                      </Text>
                    ) : null}

                    <TextField
                      label={isClaim ? 'What is the claim for?' : 'Details'}
                      value={requestReason}
                      onChangeText={setRequestReason}
                      placeholder={isClaim ? 'e.g. Site visits this week' : "e.g. Fuel for today's jobs"}
                      multiline
                    />

                    {requestError ? <Notice tone="error" message={requestError} /> : null}

                    <View style={styles.settleActions}>
                      <Button label="Cancel" variant="secondary" onPress={() => setRequesting(false)} style={styles.settleActionButton} />
                      <Button
                        label={isClaim ? 'Start claim' : 'Submit'}
                        loadingLabel="Submitting…"
                        onPress={submitRequest}
                        loading={requestBusy}
                        style={styles.settleActionButton}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={[typography.label, styles.sectionLabel]}>Your requests awaiting the office</Text>
                {pendingRequests.map((r) => (
                  <View key={r._id} style={styles.payoutRow}>
                    <View style={styles.payoutInfo}>
                      <Text style={[typography.bodyStrong, styles.payoutAmount]}>
                        {WALLET_REQUEST_CATEGORY_LABEL[r.category]} · {formatMoney(r.amount)}
                      </Text>
                      <Text style={[typography.caption, styles.payoutNote]}>{r.reason}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Always shown, so engineers know the feature exists before their first advance. */}
            <View style={styles.section}>
              <Text style={[typography.label, styles.sectionLabel]}>Expense advances & claims</Text>
              {!advancesAvailable ? (
                <Text style={[typography.caption, styles.emptyText]}>
                  Not available yet — the server needs the latest update. Pull down to try again.
                </Text>
              ) : approvedAdvances.length === 0 && !pendingAdvance ? (
                <View style={styles.advanceEmpty}>
                  <Text style={[typography.small, styles.payoutAmount]}>Spending on travel or food for a job?</Text>
                  <Text style={[typography.caption, styles.payoutNote]}>
                    Tap Request money. Choose Expense Advance to get money before you spend it, or Expense Claim to
                    get back money you already spent. Add each expense with a receipt, and the office settles it.
                  </Text>
                </View>
              ) : null}
              {pendingAdvance ? (
                <View style={styles.payoutRow}>
                  <View style={styles.payoutInfo}>
                    <Text style={[typography.bodyStrong, styles.payoutAmount]}>
                      {formatMoney(pendingAdvance.amount)} · Waiting for approval
                    </Text>
                    <Text style={[typography.caption, styles.payoutNote]} numberOfLines={1}>
                      {pendingAdvance.reason}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {approvedAdvances.length > 0 && (
              <View style={[styles.section, styles.advanceList]}>
                {approvedAdvances.map(({ request: r, totals }) => (
                  <Pressable
                    key={r._id}
                    onPress={() => router.push({ pathname: '/(tabs)/profile/advance', params: { requestId: r._id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${WALLET_REQUEST_CATEGORY_LABEL[r.category]}, ${ADVANCE_STATUS_LABEL[r.settlementStatus!]}`}
                    style={({ pressed }) => [styles.payoutRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.payoutInfo}>
                      <Text style={[typography.bodyStrong, styles.payoutAmount]}>
                        {r.category === 'expense_claim'
                          ? `Claim · ${formatMoney(totals?.claimed ?? 0)}`
                          : `Advance · ${formatMoney(r.amount)}`}{' '}
                        · {ADVANCE_STATUS_LABEL[r.settlementStatus!]}
                      </Text>
                      <Text style={[typography.caption, styles.payoutNote]} numberOfLines={1}>
                        {r.settlementStatus === 'settled'
                          ? (r.settlementDifference ?? 0) < 0
                            ? `You owe ${formatMoney(r.settlementDifference ?? 0)}`
                            : (r.settlementDifference ?? 0) > 0
                              ? `Office owes you ${formatMoney(r.settlementDifference ?? 0)}`
                              : r.category === 'expense_claim'
                                ? 'Nothing approved'
                                : 'All square'
                          : totals && r.category !== 'expense_claim'
                            ? `${formatMoney(totals.claimed)} spent · ${r.reason}`
                            : r.reason}
                      </Text>
                      {r.settlementStatus === 'open' && r.sentBackNote ? (
                        <Text style={[typography.caption, styles.sentBack]} numberOfLines={1}>
                          Sent back: {r.sentBackNote}
                        </Text>
                      ) : null}
                    </View>
                    {r.settlementStatus === 'settled' ? (
                      <Pressable
                        onPress={() => void dismissNotice(r._id)}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Remove from list"
                        style={styles.rowDismiss}
                      >
                        <Text style={styles.rowDismissText}>✕</Text>
                      </Pressable>
                    ) : (
                      <Text style={styles.chevron}>›</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {recentlyDeclined.length > 0 && (
              <View style={styles.section}>
                <Text style={[typography.label, styles.sectionLabel]}>Declined requests</Text>
                {recentlyDeclined.map((r) => (
                  <Notice
                    key={r._id}
                    tone="warning"
                    message={`${WALLET_REQUEST_CATEGORY_LABEL[r.category]} · ${formatMoney(r.amount)} — ${r.decisionNote || 'Declined by the office.'}`}
                  />
                ))}
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
                      {e.status === 'rejected' && e.rejectionNote ? (
                        <Text style={[typography.caption, styles.txRejected]}>Rejected by office — {e.rejectionNote}</Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        typography.bodyStrong,
                        e.status === 'rejected'
                          ? styles.txAmountRejected
                          : e.amount >= 0
                            ? styles.txAmountPositive
                            : styles.txAmountNegative,
                      ]}
                    >
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
  rowPressed: {
    opacity: 0.75,
  },
  advanceEmpty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  // Pulls the approved list up under its heading above.
  advanceList: {
    marginTop: -spacing.sm,
  },
  sentBack: {
    color: colors.warning,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    color: colors.textFaint,
  },
  rowDismiss: {
    padding: spacing.xs,
  },
  rowDismissText: {
    fontSize: 16,
    fontWeight: '700',
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
  txAmountRejected: {
    color: colors.textFaint,
    textDecorationLine: 'line-through',
  },
  txRejected: {
    color: colors.danger,
    marginTop: 2,
  },
});
