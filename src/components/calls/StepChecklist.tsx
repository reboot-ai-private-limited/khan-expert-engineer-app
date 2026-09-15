import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import type { ServiceStep } from '@/types/call';

export interface StepInput {
  notes: string;
  amount: string;
}

interface StepChecklistProps {
  steps: ServiceStep[];
  values: Record<number, StepInput>;
  onChange: (order: number, patch: Partial<StepInput>) => void;
  /** True once the shared job-photo gallery has at least one photo — satisfies any step's requiresPhoto. */
  hasPhoto: boolean;
}

/**
 * Structured per-service-type checklist, replacing the free-text remarks
 * box when the service type has steps configured. A step's photo
 * requirement is satisfied by the shared Photos section below (one photo
 * pool per job, not per step) rather than a separate per-step upload flow.
 */
export const StepChecklist: React.FC<StepChecklistProps> = ({ steps, values, onChange, hasPhoto }) => {
  return (
    <View style={styles.container}>
      {steps.map((step) => {
        const value = values[step.order] ?? { notes: '', amount: '' };
        return (
          <View key={step.order} style={styles.card}>
            <Text style={[typography.bodyStrong, styles.label]}>{step.label}</Text>
            <TextInput
              value={value.notes}
              onChangeText={(text) => onChange(step.order, { notes: text })}
              placeholder="Notes for this step"
              placeholderTextColor={colors.textFaint}
              multiline
              style={[typography.small, styles.notesInput]}
            />
            {step.requiresAmount ? (
              <View style={styles.amountRow}>
                <Text style={[typography.small, styles.rupee]}>₹</Text>
                <TextInput
                  value={value.amount}
                  onChangeText={(text) => onChange(step.order, { amount: text.replace(/[^0-9]/g, '') })}
                  placeholder="Amount for this step"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  style={[typography.small, styles.amountInput]}
                />
              </View>
            ) : null}
            {step.requiresPhoto && !hasPhoto ? (
              <Text style={[typography.caption, styles.photoHint]}>Add a photo below for this step.</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.text,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    minHeight: 44,
    textAlignVertical: 'top',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  rupee: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontWeight: '700',
  },
  photoHint: {
    color: colors.textFaint,
  },
});
