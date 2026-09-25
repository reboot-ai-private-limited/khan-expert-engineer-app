import * as SecureStore from 'expo-secure-store';

/**
 * Ids of wallet notices the engineer has closed (a rejected settlement, so
 * far), so a notice stays gone across app restarts.
 *
 * Only ever a convenience: if storage fails, the notice just shows again.
 * Capped so it cannot grow without bound.
 */

const KEY = 'ket.wallet.dismissedNotices';
const MAX = 30;

export const dismissedNotices = {
  async get(): Promise<string[]> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
    } catch {
      return [];
    }
  },

  async add(id: string): Promise<string[]> {
    const next = [id, ...(await dismissedNotices.get()).filter((v) => v !== id)].slice(0, MAX);
    try {
      await SecureStore.setItemAsync(KEY, JSON.stringify(next));
    } catch {
      // Not worth surfacing — worst case it shows again next time.
    }
    return next;
  },
};
