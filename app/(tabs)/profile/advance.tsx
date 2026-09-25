import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { walletApi } from '@/api/endpoints/wallet';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { Notice } from '@/components/feedback/Notice';
import { colors, radius, spacing, typography } from '@/theme';
import {
  ADVANCE_EXPENSE_TYPE_LABEL,
  ADVANCE_STATUS_LABEL,
  type AdvanceDetail,
  type AdvanceExpense,
} from '@/types/wallet';

const formatMoney = (n: number) => `₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

const errorText = (err: unknown, fallback: string) =>
  isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? fallback);

/**
 * One expense advance: what was given, what has been spent against it, and
 * — once the office settles — what is left to pay back or be paid.
 *
 * Expenses can be added and changed only while the advance is open. After
 * submitting, it is the office's; they can send it back to fix something.
 */
export default function AdvanceScreen() {
  const insets = useSafeAreaInsets();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();

  const [detail, setDetail] = useState<AdvanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!requestId) return;
    setError(null);
    try {
      setDetail(await walletApi.getAdvance(requestId));
    } catch (err) {
      setError(errorText(err, 'Could not load this advance.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  // Refetch whenever this screen comes back into view — after adding or
  // editing an expense on the form screen.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openForm = (expenseId?: string) =>
    router.push({
      pathname: '/(tabs)/profile/advance-expense',
      params: expenseId ? { requestId, expenseId } : { requestId },
    });

  const submit = () => {
    if (!detail) return;
    const { totals } = detail;
    if (isClaim && detail.expenses.length === 0) {
      setError('Add at least one expense before submitting your claim.');
      return;
    }
    const summary =
      detail.expenses.length === 0
        ? `You have not added any expenses. The full ${formatMoney(totals.advance)} will be owed back to the office.`
        : `${detail.expenses.length} expense${detail.expenses.length === 1 ? '' : 's'}, ${formatMoney(totals.claimed)} in total. You cannot change them after submitting unless the office sends them back.`;

    Alert.alert('Submit to the office?', summary, [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Submit',
        onPress: async () => {
          setSubmitting(true);
          setError(null);
          try {
            setDetail(await walletApi.submitAdvance(requestId));
          } catch (err) {
            setError(errorText(err, 'Could not submit the advance.'));
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const request = detail?.request;
  const totals = detail?.totals;
  /** A claim is money already spent — no advance, so no "left" or "overspent". */
  const isClaim = request?.category === 'expense_claim';
  const status = request?.settlementStatus;
  const open = status === 'open';
  const usedRatio = totals && totals.advance > 0 ? Math.min(totals.claimed / totals.advance, 1) : 0;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>{isClaim ? 'Expense claim' : 'Expense advance'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.brand}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.brand} style={styles.loader} />
        ) : !detail || !request || !totals || !status ? (
          <Notice tone="error" message={error ?? 'This advance could not be found.'} />
        ) : (
          <>
            {error ? <Notice tone="error" message={error} /> : null}

            {/* Summary */}
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={[typography.caption, styles.muted]}>
                  {isClaim ? 'Started' : 'Given'} {formatDay(isClaim ? request.requestedAt : (request.decidedAt ?? request.requestedAt))}
                </Text>
                <View style={[styles.statusPill, styles[`status_${status}`]]}>
                  <Text style={[typography.caption, styles.statusText]}>{ADVANCE_STATUS_LABEL[status]}</Text>
                </View>
              </View>
              <Text style={[typography.display, styles.amount]}>
                {formatMoney(isClaim ? totals.claimed : totals.advance)}
              </Text>
              <Text style={[typography.small, styles.muted]} numberOfLines={2}>
                {request.reason}
              </Text>

              {isClaim ? (
                status !== 'open' ? (
                  <View style={styles.totalsRow}>
                    <Total label="Claimed" value={formatMoney(totals.claimed)} />
                    <Total label="Approved" value={formatMoney(totals.approved)} />
                  </View>
                ) : null
              ) : (
                <>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${usedRatio * 100}%` },
                        totals.unaccounted < 0 && styles.progressOver,
                      ]}
                    />
                  </View>
                  <View style={styles.totalsRow}>
                    <Total label="Spent" value={formatMoney(totals.claimed)} />
                    <Total
                      label={totals.unaccounted < 0 ? 'Overspent' : 'Left'}
                      value={formatMoney(totals.unaccounted)}
                      tone={totals.unaccounted < 0 ? 'warning' : undefined}
                    />
                    {status !== 'open' ? <Total label="Approved" value={formatMoney(totals.approved)} /> : null}
                  </View>
                </>
              )}
            </View>

            {/* What happens next */}
            {open && request.sentBackNote ? (
              <Notice tone="warning" message={`Sent back by the office: ${request.sentBackNote}`} action="Fix it, then submit again." />
            ) : null}
            {open && !request.sentBackNote ? (
              <Notice
                tone="info"
                message={
                  isClaim
                    ? 'Add every expense you paid yourself, with a receipt photo where you have one.'
                    : 'Add every expense paid from this advance, with a receipt photo where you have one.'
                }
                action="When you are done, submit it to the office."
              />
            ) : null}
            {status === 'submitted' ? (
              <Notice
                tone="info"
                message="The office is reviewing your expenses."
                action="You will see the result here once they settle it."
              />
            ) : null}
            {status === 'settled' ? <SettledNotice detail={detail} /> : null}

            {/* Expenses */}
            <View style={styles.section}>
              <Text style={[typography.label, styles.sectionLabel]}>Expenses ({detail.expenses.length})</Text>
              {detail.expenses.length === 0 ? (
                <Text style={[typography.caption, styles.faint]}>Nothing added yet.</Text>
              ) : (
                detail.expenses.map((expense) => (
                  <ExpenseRow
                    key={expense._id}
                    expense={expense}
                    showReview={status !== 'open' || expense.status !== 'pending'}
                    onPress={open ? () => openForm(expense._id) : undefined}
                  />
                ))
              )}
            </View>

            {open ? (
              <View style={styles.actions}>
                <Button label="Add expense" variant="secondary" onPress={() => openForm()} />
                <Button label="Submit to office" loadingLabel="Submitting…" onPress={submit} loading={submitting} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const Total: React.FC<{ label: string; value: string; tone?: 'warning' }> = ({ label, value, tone }) => (
  <View style={styles.total}>
    <Text style={[typography.caption, styles.muted]}>{label}</Text>
    <Text style={[typography.bodyStrong, tone === 'warning' ? styles.warningText : styles.text]}>{value}</Text>
  </View>
);

const SettledNotice: React.FC<{ detail: AdvanceDetail }> = ({ detail }) => {
  const diff = detail.request.settlementDifference ?? 0;
  const claim = detail.request.category === 'expense_claim';
  const message =
    diff === 0
      ? claim
        ? 'Settled — none of these expenses were approved.'
        : 'Settled — your expenses matched the advance exactly.'
      : diff < 0
        ? `Settled — you owe the office ${formatMoney(diff)}.`
        : `Settled — the office owes you ${formatMoney(diff)}.`;
  const action =
    diff < 0
      ? detail.request.recoveryMode === 'deduct'
        ? 'It will be deducted from your future commission.'
        : 'Return it to the office — use Settle on the Wallet screen.'
      : diff > 0
        ? 'It is in your wallet balance; the office will pay it out.'
        : undefined;
  return (
    <>
      <Notice tone={diff < 0 ? 'warning' : 'success'} message={message} action={action} />
      {detail.request.settlementNote ? (
        <Text style={[typography.caption, styles.muted]}>Office note: {detail.request.settlementNote}</Text>
      ) : null}
    </>
  );
};

const ExpenseRow: React.FC<{ expense: AdvanceExpense; showReview: boolean; onPress?: () => void }> = ({
  expense,
  showReview,
  onPress,
}) => {
  const cut = expense.status === 'approved' && expense.approvedAmount !== undefined && expense.approvedAmount < expense.amount;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.expenseRow, pressed && styles.pressed]}
    >
      <View style={styles.expenseInfo}>
        <Text style={[typography.bodyStrong, styles.text]}>{ADVANCE_EXPENSE_TYPE_LABEL[expense.type]}</Text>
        <Text style={[typography.caption, styles.muted]}>
          {formatDay(expense.spentOn)}
          {expense.callNumber ? ` · Job ${expense.callNumber}` : ''}
          {expense.receiptUrl ? ' · Receipt' : ' · No receipt'}
        </Text>
        {expense.description ? (
          <Text style={[typography.caption, styles.muted]} numberOfLines={2}>
            {expense.description}
          </Text>
        ) : null}
        {showReview && expense.status === 'rejected' ? (
          <Text style={[typography.caption, styles.dangerText]}>Rejected — {expense.reviewNote}</Text>
        ) : null}
        {showReview && cut ? (
          <Text style={[typography.caption, styles.warningText]}>
            Approved {formatMoney(expense.approvedAmount!)} — {expense.reviewNote}
          </Text>
        ) : null}
      </View>
      <View style={styles.expenseRight}>
        <Text
          style={[
            typography.bodyStrong,
            styles.text,
            showReview && (expense.status === 'rejected' || cut) && styles.struck,
          ]}
        >
          {formatMoney(expense.amount)}
        </Text>
        {showReview && expense.status === 'approved' && !cut ? (
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        ) : null}
        {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textFaint} /> : null}
      </View>
    </Pressable>
  );
};

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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    color: colors.text,
  },
  statusPill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  status_open: {
    backgroundColor: colors.infoWash,
  },
  status_submitted: {
    backgroundColor: colors.warningWash,
  },
  status_settled: {
    backgroundColor: colors.successWash,
  },
  statusText: {
    color: colors.textSoft,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sunken,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  progressOver: {
    backgroundColor: colors.warning,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  total: {
    gap: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.textMuted,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
  expenseInfo: {
    flex: 1,
    gap: 2,
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
  },
  text: {
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
  faint: {
    color: colors.textFaint,
  },
  warningText: {
    color: colors.warning,
  },
  dangerText: {
    color: colors.danger,
  },
  struck: {
    textDecorationLine: 'line-through',
    color: colors.textFaint,
  },
});
