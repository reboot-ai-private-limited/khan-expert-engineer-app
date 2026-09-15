/**
 * Palette matched to the admin web panel's blue theme (see
 * frontend/src/index.css — --color-custom-blue / --color-sidebar-bg),
 * so the engineer app and the office CRM read as one product. Neutrals
 * carry a slight blue-slate bias so they read as chosen rather than
 * inherited.
 *
 * Contrast is deliberately high: this app is used outdoors, in sunlight,
 * often one-handed.
 */
export const colors = {
  // Brand
  brand: '#0072E8',
  brandDark: '#0B192C',
  brandLight: '#0A58CA',
  brandWash: '#EFF6FF',

  // Ground
  background: '#F1F5F9',
  surface: '#FFFFFF',
  sunken: '#F8FAFC',

  // Ink
  text: '#0F172A',
  textSoft: '#1E293B',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  textOnBrand: '#FFFFFF',

  // Lines
  border: '#E2E8F0',
  borderSoft: '#EEF2F6',
  borderFocus: '#0072E8',

  // Semantic — separate from the brand accent
  danger: '#EF4444',
  dangerWash: '#FEF2F2',
  warning: '#F59E0B',
  warningWash: '#FFFBEB',
  success: '#10B981',
  successWash: '#ECFDF5',
  info: '#0072E8',
  infoWash: '#EFF6FF',

  // States
  disabled: '#CBD5E1',
  disabledText: '#94A3B8',
  overlay: 'rgba(11, 25, 44, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;
