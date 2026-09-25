import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/common/Button';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { TextField } from '@/components/common/TextField';
import { Notice } from '@/components/feedback/Notice';
import { engineerCallsApi } from '@/api/endpoints/engineerCalls';
import { isNetworkError, serverMessage } from '@/api/client';
import { colors, spacing, typography } from '@/theme';
import type { EngineerCall } from '@/types/call';

interface CancellationCardProps {
  call: EngineerCall;
  onUpdated: (updated: EngineerCall) => void;
}

const formatWhen = (iso?: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Ask the office to cancel this call — meaning take the engineer off it,
 * not cancel the customer's ticket. The call stays open; approval clears
 * the assignment and the office gives it to someone else.
 *
 * An engineer has never been able to drop a ticket themselves — the server
 * refuses it outright. This turns that refusal into a request the office
 * can answer. While one is pending the job is locked (the server rejects
 * edits too, so this is not the only guard), and an approved request
 * removes the job from this engineer's list — it reappears, unassigned, for
 * the office to hand to the next engineer.
 */
export const CancellationCard: React.FC<CancellationCardProps> = ({ call, onUpdated }) => {
  const request = call.cancellationRequest;
  const pending = request?.status === 'pending';
  const declined = request?.status === 'declined';

  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (submitting) return;
    setError(null);

    if (!reason.trim()) {
      setError('Tell the office why this job cannot be done.');
      return;
    }

    setSubmitting(true);
    try {
      onUpdated(await engineerCallsApi.requestCancellation(call._id, reason.trim()));
      setReason('');
    } catch (err) {
      setError(
        isNetworkError(err)
          ? 'Could not reach the server. Try again once you have signal.'
          : (serverMessage(err) ?? 'Could not send the cancellation request.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const summary = pending
    ? 'Waiting for the office'
    : declined
      ? 'Declined by the office'
      : 'Ask the office to cancel';

  return (
    // Auto-expanded while something needs the engineer's attention: a
    // pending request explains why the job is locked, and a decline tells
    // them to carry on. Otherwise it stays out of the way.
    <CollapsibleSection title="Cancel this call" summary={summary} defaultExpanded={pending || declined}>
      {pending && request ? (
        <View style={styles.block}>
          <Notice
            tone="info"
            message="You have asked the office to cancel this call."
            action="It stays locked until they decide."
          />
          <Field label="Your reason" value={request.reason} />
          <Field label="Requested" value={formatWhen(request.requestedAt)} />
        </View>
      ) : declined && request ? (
        <View style={styles.block}>
          <Notice
            tone="warning"
            message="The office declined this cancellation — please carry on with the job."
          />
          {request.decisionNote ? <Field label="Office said" value={request.decisionNote} /> : null}
          <Field label="Your reason was" value={request.reason} />
          <Field
            label="Decided"
            value={[formatWhen(request.decidedAt), request.decidedBy].filter(Boolean).join(' · ')}
          />
          <Text style={[typography.caption, styles.hint]}>
            Still cannot do it? Send another request with what has changed.
          </Text>
          <TextField
            label="New reason"
            value={reason}
            onChangeText={setReason}
            placeholder="What has changed since?"
            multiline
          />
          {error ? <Notice tone="error" message={error} /> : null}
          <Button label="Request again" loadingLabel="Sending…" onPress={submit} loading={submitting} />
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={[typography.small, styles.intro]}>
            The office decides — the job stays assigned to you until they do. Only ask when the work genuinely
            cannot be done.
          </Text>
          <TextField
            label="Why can this job not be done?"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Customer has moved away"
            multiline
          />
          {error ? <Notice tone="error" message={error} /> : null}
          <Button
            label="Request cancellation"
            loadingLabel="Sending…"
            variant="secondary"
            onPress={submit}
            loading={submitting}
          />
        </View>
      )}
    </CollapsibleSection>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) =>
  value ? (
    <View style={styles.field}>
      <Text style={[typography.caption, styles.fieldLabel]}>{label}</Text>
      <Text style={[typography.body, styles.fieldValue]}>{value}</Text>
    </View>
  ) : null;

const styles = StyleSheet.create({
  block: {
    gap: spacing.md,
  },
  intro: {
    color: colors.textMuted,
  },
  hint: {
    color: colors.textFaint,
  },
  field: {
    gap: 2,
  },
  fieldLabel: {
    color: colors.textFaint,
  },
  fieldValue: {
    color: colors.text,
  },
});
