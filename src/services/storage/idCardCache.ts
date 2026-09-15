import * as SecureStore from 'expo-secure-store';
import type { IdCard } from '@/types/idCard';

/**
 * Per-job cache so a card renders offline (per spec — "an engineer in a
 * basement with no signal must still be able to show it"). Only the card's
 * own data is cached; the engineer photo is a live signed Cloudinary URL and
 * may not load without signal, same trade the verification page makes.
 */
const keyFor = (callId: string) => `ket.engineer.idcard.${callId}`;

export const idCardCache = {
  async get(callId: string): Promise<IdCard | null> {
    try {
      const raw = await SecureStore.getItemAsync(keyFor(callId));
      return raw ? (JSON.parse(raw) as IdCard) : null;
    } catch {
      return null;
    }
  },

  async set(callId: string, card: IdCard): Promise<void> {
    try {
      await SecureStore.setItemAsync(keyFor(callId), JSON.stringify(card));
    } catch {
      // Best-effort cache — a write failure just means no offline copy this time.
    }
  },
};
