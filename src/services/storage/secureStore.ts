import * as SecureStore from 'expo-secure-store';
import type { EngineerProfile } from '@/types/auth';

/**
 * Keystore-backed session storage.
 *
 * The web CRM keeps its token in localStorage; that habit must not carry
 * over. On a personal device holding a 30-day token, the token belongs in
 * the platform keystore.
 */

const TOKEN_KEY = 'ket.engineer.token';
const PROFILE_KEY = 'ket.engineer.profile';
const LAST_LOGIN_ID_KEY = 'ket.engineer.lastLoginId';

/**
 * SecureStore throws on some devices (no keystore, locked device, wiped
 * credentials). A read failure means "no session", never a crash on boot.
 */
const safeGet = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    if (__DEV__) console.warn(`[secureStore] read failed for ${key}`, error);
    return null;
  }
};

const safeSet = async (key: string, value: string): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (error) {
    if (__DEV__) console.warn(`[secureStore] write failed for ${key}`, error);
    return false;
  }
};

const safeDelete = async (key: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    if (__DEV__) console.warn(`[secureStore] delete failed for ${key}`, error);
  }
};

export const sessionStorage = {
  getToken: () => safeGet(TOKEN_KEY),

  setToken: (token: string) => safeSet(TOKEN_KEY, token),

  async getProfile(): Promise<EngineerProfile | null> {
    const raw = await safeGet(PROFILE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as EngineerProfile;
    } catch {
      // Corrupt payload is treated as no session rather than propagated.
      await safeDelete(PROFILE_KEY);
      return null;
    }
  },

  setProfile: (profile: EngineerProfile) =>
    safeSet(PROFILE_KEY, JSON.stringify(profile)),

  /**
   * The identifier only — never the password. Saves the engineer retyping
   * a phone number every morning.
   */
  getLastLoginId: () => safeGet(LAST_LOGIN_ID_KEY),

  setLastLoginId: (loginId: string) => safeSet(LAST_LOGIN_ID_KEY, loginId),

  /** Clears the session but deliberately keeps the remembered identifier. */
  async clearSession(): Promise<void> {
    await Promise.all([safeDelete(TOKEN_KEY), safeDelete(PROFILE_KEY)]);
  },
};
