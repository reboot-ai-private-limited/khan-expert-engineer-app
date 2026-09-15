import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius, spacing, touchTarget, typography } from '@/theme';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Shown beneath the field, in red. Also flags the field as invalid. */
  error?: string;
  /** Shown beneath the field when there is no error. */
  hint?: string;
  /** Adds a show/hide toggle and masks the value. */
  secure?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  ({ label, error, hint, secure = false, ...inputProps }, ref) => {
    const [focused, setFocused] = useState(false);
    const [revealed, setRevealed] = useState(false);

    const hasError = Boolean(error);

    return (
      <View style={styles.wrapper}>
        <Text style={[typography.label, styles.label]}>{label}</Text>

        <View
          style={[
            styles.inputRow,
            focused && styles.inputRowFocused,
            hasError && styles.inputRowError,
          ]}
        >
          <TextInput
            ref={ref}
            {...inputProps}
            style={[typography.body, styles.input]}
            secureTextEntry={secure && !revealed}
            placeholderTextColor={colors.textFaint}
            onFocus={(e) => {
              setFocused(true);
              inputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              inputProps.onBlur?.(e);
            }}
            accessibilityLabel={label}
            accessibilityState={{ disabled: inputProps.editable === false }}
          />

          {secure && (
            <Pressable
              onPress={() => setRevealed((v) => !v)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
              style={styles.reveal}
            >
              <Text style={[typography.caption, styles.revealText]}>
                {revealed ? 'HIDE' : 'SHOW'}
              </Text>
            </Pressable>
          )}
        </View>

        {hasError ? (
          <Text style={[typography.caption, styles.error]}>{error}</Text>
        ) : hint ? (
          <Text style={[typography.caption, styles.hint]}>{hint}</Text>
        ) : null}
      </View>
    );
  }
);

TextField.displayName = 'TextField';

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.comfortable,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  inputRowFocused: {
    borderColor: colors.borderFocus,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  reveal: {
    paddingLeft: spacing.md,
  },
  revealText: {
    color: colors.brand,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  error: {
    color: colors.danger,
  },
  hint: {
    color: colors.textMuted,
  },
});
