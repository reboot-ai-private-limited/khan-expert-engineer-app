import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import { isFinished } from '@/utils/callStatus';
import type { EngineerCall } from '@/types/call';
import { StatusPill } from './StatusPill';

interface CallCardProps {
  call: EngineerCall;
}

/** "9 Sep, 3:00 pm" — short enough for a card, unambiguous enough for a job. */
const formatWhen = (iso: string | undefined): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const CallCard: React.FC<CallCardProps> = ({ call }) => {
  const scheduled = formatWhen(call.visitdate ?? call.etaDate);
  const machine = [call.brandName, call.productsName].filter(Boolean).join(' · ');
  // The engineer has no reason to reach the customer once the job is done,
  // so the number stops being offered here (see also the job detail screen).
  const canCallCustomer = Boolean(call.contactNumber) && !isFinished(call);

  const callCustomer = () => {
    if (!call.contactNumber) return;
    void Linking.openURL(`tel:${call.contactNumber}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={[typography.bodyStrong, styles.customer]} numberOfLines={1}>
          {call.customerName}
        </Text>
        <Text style={[typography.caption, styles.callNumber]} numberOfLines={1}>
          {call.callNumber}
        </Text>
      </View>

      {machine ? (
        <Text style={[typography.small, styles.machine]} numberOfLines={1}>
          {machine}
        </Text>
      ) : null}

      {call.address ? (
        <Text style={[typography.small, styles.address]} numberOfLines={2}>
          {call.address}
        </Text>
      ) : null}

      <View style={styles.bottomRow}>
        <StatusPill jobStatus={call.jobStatus} />

        <View style={styles.bottomRight}>
          {scheduled ? (
            <Text style={[typography.caption, styles.when]} numberOfLines={1}>
              {scheduled}
            </Text>
          ) : null}

          {canCallCustomer ? (
            <Pressable
              onPress={callCustomer}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Call ${call.customerName}`}
              style={({ pressed }) => [styles.callButton, pressed && styles.callButtonPressed]}
            >
              <Text style={[typography.caption, styles.callButtonText]}>Call</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  customer: {
    color: colors.text,
    flexShrink: 1,
  },
  callNumber: {
    color: colors.textFaint,
  },
  machine: {
    color: colors.textMuted,
  },
  address: {
    color: colors.textMuted,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  bottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  when: {
    color: colors.textMuted,
  },
  callButton: {
    backgroundColor: colors.brandWash,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  callButtonPressed: {
    opacity: 0.75,
  },
  callButtonText: {
    color: colors.brand,
    fontWeight: '700',
  },
});
