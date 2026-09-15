import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, touchTarget, typography } from '@/theme';

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown beneath the field, in red. Also flags the field as invalid. */
  error?: string;
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  error,
  disabled = false,
}) => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const hasError = Boolean(error);

  const select = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[typography.label, styles.label]}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${value || placeholder}`}
        accessibilityState={{ disabled, expanded: open }}
        style={({ pressed }) => [
          styles.field,
          hasError && styles.fieldError,
          disabled && styles.fieldDisabled,
          pressed && !disabled && styles.fieldPressed,
        ]}
      >
        <Text
          style={[typography.body, value ? styles.valueText : styles.placeholderText]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>

      {hasError ? <Text style={[typography.caption, styles.error]}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close">
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[typography.heading, styles.sheetTitle]}>{label}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={styles.list}
              renderItem={({ item }) => {
                const active = item === value;
                return (
                  <Pressable
                    onPress={() => select(item)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    <Text
                      style={[typography.body, styles.optionText, active && styles.optionTextActive]}
                    >
                      {item}
                    </Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: touchTarget.comfortable,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  fieldPressed: {
    borderColor: colors.borderFocus,
  },
  valueText: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
  },
  placeholderText: {
    flex: 1,
    color: colors.textFaint,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    maxHeight: '70%',
  },
  sheetTitle: {
    color: colors.text,
    marginBottom: spacing.md,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touchTarget.min,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  optionActive: {
    // The tick carries the selected state; the row only tints its text.
  },
  optionPressed: {
    backgroundColor: colors.sunken,
  },
  optionText: {
    color: colors.text,
    flex: 1,
  },
  optionTextActive: {
    color: colors.brand,
    fontWeight: '700',
  },
  check: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 16,
  },
});
