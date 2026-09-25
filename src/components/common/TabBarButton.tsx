import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  // The tab bar marks the current tab through accessibility state.
  const selected = Boolean(rest.accessibilityState?.selected ?? rest['aria-selected']);

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: colors.brandWash, borderless: false }}
      // The tab bar's own item style top-aligns the icon + label (flex-start,
      // 5px padding). Re-centre after it so the underline sits right under the
      // label instead of stranded at the bottom edge of the bar.
      style={({ pressed }) => [styles.button, style, styles.centred, pressed && styles.pressed]}
      {...rest}
    >
      <View style={styles.content}>
        {children}
        {/* A short brand-blue bar under the current tab. Always laid out so
            switching tabs doesn't nudge the icon/label up and down. */}
        <View style={[styles.indicator, selected && styles.indicatorActive]} />
      </View>
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
  centred: {
    justifyContent: 'center',
    paddingVertical: 0,
  },
  content: {
    alignItems: 'center',
  },
  indicator: {
    marginTop: 4,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorActive: {
    backgroundColor: colors.brand,
  },
  pressed: {
    opacity: 0.7,
  },
});
