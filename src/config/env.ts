/**
 * Runtime configuration. EXPO_PUBLIC_* values are inlined at build time.
 */

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

/**
 * Normalise the base URL the same way the web client does: strip trailing
 * slashes and guarantee a single /api suffix, so both
 * "https://host.com" and "https://host.com/api/" resolve identically.
 */
const normaliseApiUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const env = {
  apiUrl: normaliseApiUrl(rawApiUrl),
  supportPhone: (process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? '').trim(),
  isDev: __DEV__,
} as const;

/**
 * Fail loudly in development rather than shipping a build that silently
 * points at nothing.
 */
if (__DEV__ && !env.apiUrl) {
  console.warn(
    '[config] EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and set it, ' +
      'then restart the dev server — env vars are inlined at bundle time.'
  );
}
