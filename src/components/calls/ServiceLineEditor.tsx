import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';
import type { EngineerServiceLine } from '@/types/call';

interface ServiceLineEditorProps {
  value: EngineerServiceLine[];
  onChange: (next: EngineerServiceLine[]) => void;
}

export const ServiceLineEditor: React.FC<ServiceLineEditorProps> = ({ value, onChange }) => {
  const total = value.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);

  const update = (index: number, patch: Partial<EngineerServiceLine>) => {
    const next = value.slice();
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...value, { serviceName: '', amount: 0 }]);
  };

  return (
    <View style={styles.container}>
      {value.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[typography.caption, styles.emptyText]}>
            No services added yet. Add what you did and what was charged.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {value.map((line, index) => (
            <View key={index} style={styles.row}>
              <TextInput
                value={line.serviceName}
                onChangeText={(text) => update(index, { serviceName: text })}
                placeholder="Service (e.g. Gas Charging)"
                placeholderTextColor={colors.textFaint}
                style={[typography.small, styles.nameInput]}
              />
              <View style={styles.amountWrap}>
                <Text style={[typography.small, styles.rupee]}>₹</Text>
                <TextInput
                  value={line.amount ? String(line.amount) : ''}
                  onChangeText={(text) => update(index, { amount: Number(text.replace(/[^0-9]/g, '')) || 0 })}
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  style={[typography.small, styles.amountInput]}
                />
              </View>
              <Pressable
                onPress={() => remove(index)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Remove this service"
                style={styles.removeButton}
              >
                <Text style={styles.removeText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={add}
        accessibilityRole="button"
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
      >
        <Text style={[typography.small, styles.addButtonText]}>+ Add service</Text>
      </Pressable>

      {value.length > 0 ? (
        <View style={styles.totalRow}>
          <Text style={[typography.small, styles.totalLabel]}>Total collected</Text>
          <Text style={[typography.bodyStrong, styles.totalValue]}>₹{total.toLocaleString('en-IN')}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textFaint,
    textAlign: 'center',
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 92,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  rupee: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingLeft: 2,
    color: colors.text,
    fontWeight: '700',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerWash,
  },
  removeText: {
    color: colors.danger,
    fontWeight: '700',
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandWash,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    color: colors.brand,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.brandWash,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  totalLabel: {
    color: colors.brandDark,
    fontWeight: '600',
  },
  totalValue: {
    color: colors.brandDark,
  },
});
