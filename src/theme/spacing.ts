export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/**
 * Minimum interactive height. Engineers tap this app outdoors, in a hurry,
 * sometimes with gloves — well above the 44pt platform minimum.
 */
export const touchTarget = {
  min: 52,
  comfortable: 56,
} as const;
