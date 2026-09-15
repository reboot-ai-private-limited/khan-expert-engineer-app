import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';

/**
 * Replaces expo-router's default tab bar button, which uses Android's
 * stock ripple — full-rectangle, edge-to-edge, default 32% black. On a
 * light tab bar that reads as a harsh dark flash on every tap. This swaps
 * in a softer, brand-tinted ripple contained to a rounded pill, and a
 * matching gentle opacity dip on iOS/web instead of no feedback at all.
 *
 * Typed loosely against expo-router's BottomTabBarButtonProps — that type
 * isn't part of the package's public exports, so this takes whatever the
 * tab bar hands it (onPress, style, accessibility props, an optional ref)
 * rather than importing an internal build path to name it precisely.
 */
export const TabBarButton = ({ children, style, onPress, onLongPress, ref, ...rest }: any) => {
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: colors.brandWash, borderless: false }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
      {...rest}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
});
