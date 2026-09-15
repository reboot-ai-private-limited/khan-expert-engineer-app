import { Platform, TextStyle } from 'react-native';

/**
 * System fonts. A custom face can be introduced later via expo-font
 * without touching call sites, because every screen reads these tokens.
 */
const family = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const familyMedium = Platform.select({
  ios: 'System',
  android: 'sans-serif-medium',
  default: 'System',
});

export const typography = {
  display: {
    fontFamily: familyMedium,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  } as TextStyle,

  title: {
    fontFamily: familyMedium,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: -0.2,
  } as TextStyle,

  heading: {
    fontFamily: familyMedium,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600',
  } as TextStyle,

  body: {
    fontFamily: family,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400',
  } as TextStyle,

  bodyStrong: {
    fontFamily: familyMedium,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  } as TextStyle,

  small: {
    fontFamily: family,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  } as TextStyle,

  caption: {
    fontFamily: family,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '400',
  } as TextStyle,

  label: {
    fontFamily: familyMedium,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,

  button: {
    fontFamily: familyMedium,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: 0.2,
  } as TextStyle,
} as const;
