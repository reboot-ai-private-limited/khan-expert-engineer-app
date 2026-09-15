import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, radius, spacing, touchTarget, typography } from '@/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  /** Text shown by screen readers and while loading. */
  loadingLabel?: string;
  style?: ViewStyle;
  testID?: string;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  loadingLabel,
  style,
  testID,
}) => {
  const isInert = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityLabel={loading ? (loadingLabel ?? label) : label}
      accessibilityState={{ disabled: isInert, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        isInert && (variant === 'primary' ? styles.primaryDisabled : styles.inertQuiet),
        pressed && !isInert && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.textOnBrand : colors.brand}
            style={styles.spinner}
          />
        )}
        <Text
          style={[
            typography.button,
            variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel,
            isInert && variant !== 'primary' && styles.inertLabel,
          ]}
          numberOfLines={1}
        >
          {loading ? (loadingLabel ?? label) : label}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.comfortable,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: spacing.sm,
  },
  primary: {
    backgroundColor: colors.brand,
  },
  primaryDisabled: {
    backgroundColor: colors.disabled,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  inertQuiet: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryLabel: {
    color: colors.textOnBrand,
  },
  secondaryLabel: {
    color: colors.brand,
  },
  inertLabel: {
    color: colors.disabledText,
  },
});
