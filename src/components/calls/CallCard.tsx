import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';
import { classifyStatus, isFinished, type StatusBucket } from '@/utils/callStatus';
import type { EngineerCall } from '@/types/call';
import { StatusPill } from './StatusPill';

interface CallCardProps {
  call: EngineerCall;
}

/** The coloured edge down the card's left side, by status. */
const STRIPE: Record<StatusBucket, string> = {
  pending: '#F6D77F',
  in_progress: '#A8C8F4',
  completed: '#9ED9BF',
  other: '#CBD5E1',
};

/** "19 Sept, 11:50 am" — short enough for a card, unambiguous enough for a job. */
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
    <View style={[styles.card, { borderLeftColor: STRIPE[classifyStatus(call.jobStatus)] }]}>
      <View style={styles.topRow}>
        <Text style={[typography.title, styles.customer]} numberOfLines={1}>
          {call.customerName}
        </Text>
        <Text style={[typography.caption, styles.callNumber]} numberOfLines={1}>
          {call.callNumber}
        </Text>
      </View>

      <View style={styles.middle}>
        <View style={styles.details}>
          {machine ? (
            <View style={styles.detailRow}>
              <Ionicons name="cube-outline" size={16} color={colors.textMuted} />
              <Text style={[typography.small, styles.detailText]} numberOfLines={1}>
                {machine}
              </Text>
            </View>
          ) : null}
          {call.address ? (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={colors.textFaint} />
              <Text style={[typography.small, styles.detailText]} numberOfLines={2}>
                {call.address}
              </Text>
            </View>
          ) : null}
          {/* On its own line: squeezed between a long status ("In Progress")
              and the Call button, the date ran into the button. */}
          {scheduled ? (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textFaint} />
              <Text style={[typography.small, styles.detailText]} numberOfLines={1}>
                {scheduled}
              </Text>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
      </View>

      <View style={styles.bottomRow}>
        <StatusPill jobStatus={call.jobStatus} withIcon size="md" />

        {canCallCustomer ? (
          <Pressable
            onPress={callCustomer}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Call ${call.customerName}`}
            style={({ pressed }) => [styles.callButton, pressed && styles.callButtonPressed]}
          >
            <Ionicons name="call" size={16} color={colors.brand} />
            <Text style={[typography.small, styles.callButtonText]}>Call</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E3E9F2',
    borderLeftWidth: 5,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    gap: 6,
    // A soft lift off the page, as in the design.
    shadowColor: '#0B192C',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
    fontWeight: '700',
  },
  callNumber: {
    color: colors.textFaint,
    marginTop: 3,
  },
  middle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  details: {
    flex: 1,
    gap: 3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    color: colors.textMuted,
    flexShrink: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  callButtonPressed: {
    opacity: 0.75,
  },
  callButtonText: {
    color: colors.brand,
    fontWeight: '700',
  },
});
