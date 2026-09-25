import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { walletApi } from '@/api/endpoints/wallet';
import { isNetworkError, serverMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { SelectField } from '@/components/common/SelectField';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { PhotoSlot } from '@/components/kyc/PhotoSlot';
import { useCalls } from '@/context/CallsContext';
import { colors, spacing, typography } from '@/theme';
import {
  ADVANCE_EXPENSE_TYPES,
  ADVANCE_EXPENSE_TYPE_LABEL,
  type AdvanceExpenseInput,
  type AdvanceExpenseType,
} from '@/types/wallet';

const errorText = (err: unknown, fallback: string) =>
  isNetworkError(err) ? 'Could not reach the server. Try again once you have signal.' : (serverMessage(err) ?? fallback);

/** How far back an expense can be dated from the picker. */
const DAYS_BACK = 14;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const dayLabel = (d: Date, index: number) =>
  index === 0
    ? 'Today'
    : index === 1
      ? 'Yesterday'
      : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const NO_JOB = 'No job';

/**
 * Add or edit one expense against an expense advance.
 *
 * `expenseId` in the params means edit. Editing an expense the office has
 * already looked at (after a send-back) puts it back to waiting for review.
 */
export default function AdvanceExpenseScreen() {
  const insets = useSafeAreaInsets();
  const { requestId, expenseId } = useLocalSearchParams<{ requestId: string; expenseId?: string }>();
  const editing = Boolean(expenseId);
  const { calls, closedCalls } = useCalls();

  const [loading, setLoading] = useState(editing);
  const [type, setType] = useState<AdvanceExpenseType>('fuel');
  const [amount, setAmount] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  /** A date older than the picker's range, kept as-is when editing. */
  const [fixedDate, setFixedDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [jobId, setJobId] = useState('');
  /** A data: URI for a new photo, or the signed URL of the one already saved. */
  const [receipt, setReceipt] = useState<string | null>(null);
  const [hadReceipt, setHadReceipt] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_BACK }, (_, i) => new Date(today.getTime() - i * 24 * 60 * 60 * 1000));
  }, []);
  const dayOptions = days.map(dayLabel);

  // Jobs the trip could have been for — most recent first, so today's are on top.
  const jobs = useMemo(
    () => [...calls, ...closedCalls].filter((c, i, all) => all.findIndex((x) => x._id === c._id) === i),
    [calls, closedCalls]
  );
  const jobLabel = (id: string) => {
    const job = jobs.find((j) => j._id === id);
    return job ? `${job.callNumber} · ${job.customerName}` : NO_JOB;
  };

  useEffect(() => {
    if (!editing || !requestId) return;
    let cancelled = false;

    (async () => {
      try {
        const detail = await walletApi.getAdvance(requestId);
        const expense = detail.expenses.find((e) => e._id === expenseId);
        if (cancelled) return;
        if (!expense) {
          setError('This expense could not be found.');
          return;
        }
        setType(expense.type);
        setAmount(String(expense.amount));
        setDescription(expense.description ?? '');
        setJobId(expense.jobId ?? '');
        setReceipt(expense.receiptUrl);
        setHadReceipt(Boolean(expense.receiptUrl));

        const spent = startOfDay(new Date(expense.spentOn)).getTime();
        const index = days.findIndex((d) => d.getTime() === spent);
        if (index >= 0) setDayIndex(index);
        else setFixedDate(new Date(expense.spentOn));
      } catch (err) {
        if (!cancelled) setError(errorText(err, 'Could not load this expense.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editing, requestId, expenseId, days]);

  const save = async () => {
    setError(null);
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Enter the amount you spent.');
      return;
    }
    if (type === 'other' && !description.trim()) {
      setError('Describe what this expense was for.');
      return;
    }

    // Noon local time, so the day survives the trip through UTC either way.
    const day = fixedDate ?? days[dayIndex];
    const spentOn = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12).toISOString();

    const newPhoto = receipt?.startsWith('data:') ? receipt : undefined;
    const input: AdvanceExpenseInput = {
      type,
      amount: amt,
      spentOn,
      description: description.trim(),
      jobId,
      receiptBase64: newPhoto,
      removeReceipt: editing && hadReceipt && !receipt ? true : undefined,
    };

    setSaving(true);
    try {
      if (editing) await walletApi.updateExpense(requestId, expenseId!, input);
      else await walletApi.addExpense(requestId, input);
      router.back();
    } catch (err) {
      setError(errorText(err, 'Could not save the expense.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    Alert.alert('Remove this expense?', 'It will no longer count against the advance.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          setError(null);
          try {
            await walletApi.deleteExpense(requestId, expenseId!);
            router.back();
          } catch (err) {
            setError(errorText(err, 'Could not remove the expense.'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? insets.top : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={[typography.title, styles.headerTitle]}>{editing ? 'Edit expense' : 'Add expense'}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.brand} style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xxxl }]}
          keyboardShouldPersistTaps="handled"
        >
          {error ? <Notice tone="error" message={error} /> : null}

          <SelectField
            label="What was it for?"
            value={ADVANCE_EXPENSE_TYPE_LABEL[type]}
            options={ADVANCE_EXPENSE_TYPES.map((t) => ADVANCE_EXPENSE_TYPE_LABEL[t])}
            onChange={(label) => {
              const match = ADVANCE_EXPENSE_TYPES.find((t) => ADVANCE_EXPENSE_TYPE_LABEL[t] === label);
              if (match) setType(match);
            }}
          />

          <TextField
            label="Amount (₹)"
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
          />

          <SelectField
            label="When"
            value={fixedDate ? fixedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : dayOptions[dayIndex]}
            options={dayOptions}
            onChange={(label) => {
              const index = dayOptions.indexOf(label);
              if (index >= 0) {
                setDayIndex(index);
                setFixedDate(null);
              }
            }}
          />

          <TextField
            label={type === 'other' ? 'What was it?' : 'Details (optional)'}
            value={description}
            onChangeText={setDescription}
            placeholder={type === 'food' ? 'e.g. Lunch at site' : type === 'fuel' ? 'e.g. Petrol, 5 litres' : 'e.g. Auto to Salt Lake'}
            multiline
          />

          <SelectField
            label="Job (optional)"
            value={jobId ? jobLabel(jobId) : NO_JOB}
            options={[NO_JOB, ...jobs.map((j) => jobLabel(j._id))]}
            onChange={(label) => {
              if (label === NO_JOB) {
                setJobId('');
                return;
              }
              const match = jobs.find((j) => jobLabel(j._id) === label);
              if (match) setJobId(match._id);
            }}
          />

          <PhotoSlot label="Receipt (optional)" value={receipt} onChange={setReceipt} recoveryId="advance-receipt" />
          {receipt ? (
            <Pressable onPress={() => setReceipt(null)} hitSlop={8} accessibilityRole="button">
              <Text style={[typography.caption, styles.removeReceipt]}>Remove receipt</Text>
            </Pressable>
          ) : (
            <Text style={[typography.caption, styles.hint]}>
              No receipt for a bus or auto fare? Add clear details instead — the office can still approve it.
            </Text>
          )}

          <Button label={editing ? 'Save changes' : 'Add expense'} loadingLabel="Saving…" onPress={save} loading={saving} />
          {editing ? (
            <Button label="Remove expense" variant="ghost" loadingLabel="Removing…" onPress={remove} loading={deleting} />
          ) : null}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
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
  loader: {
    marginTop: spacing.xxxl,
  },
  scroll: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  removeReceipt: {
    color: colors.danger,
    fontWeight: '700',
    marginTop: -spacing.sm,
  },
  hint: {
    color: colors.textFaint,
    marginTop: -spacing.sm,
  },
});
