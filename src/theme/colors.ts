/**
 * Palette anchored to the existing Field Engineer Portal, which uses
 * emerald as its accent. Neutrals carry a slight green bias so they read
 * as chosen rather than inherited.
 *
 * Contrast is deliberately high: this app is used outdoors, in sunlight,
 * often one-handed.
 */
export const colors = {
  // Brand
  brand: '#047857',
  brandDark: '#03543F',
  brandLight: '#059669',
  brandWash: '#E7F3EE',

  // Ground
  background: '#F4F7F4',
  surface: '#FFFFFF',
  sunken: '#EBF0EC',

  // Ink
  text: '#0F221B',
  textSoft: '#2C4137',
  textMuted: '#5B6E64',
  textFaint: '#8A9A91',
  textOnBrand: '#FFFFFF',

  // Lines
  border: '#D7E0D9',
  borderSoft: '#E5EBE6',
  borderFocus: '#047857',

  // Semantic — separate from the brand accent
  danger: '#B42318',
  dangerWash: '#FBEAE8',
  warning: '#B45309',
  warningWash: '#FBF0E2',
  success: '#047857',
  successWash: '#E7F3EE',
  info: '#1D4ED8',
  infoWash: '#E8EEFC',

  // States
  disabled: '#C4CFC8',
  disabledText: '#8A9A91',
  overlay: 'rgba(15, 34, 27, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;
