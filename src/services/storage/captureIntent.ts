import * as SecureStore from 'expo-secure-store';

/**
 * What the engineer was photographing when the camera opened.
 *
 * Android kills a backgrounded app to reclaim memory while the camera
 * activity is in front. On this device that happens regularly:
 *
 *   ActivityManager: Process host.exp.exponent has died: hvy LAST
 *   ActivityManager: Start proc ... for ImagePickerFileProvider
 *
 * The photo is taken successfully — expo-image-picker holds the result and
 * hands it back through `getPendingResultAsync()` on the next launch — but
 * the app has forgotten *why* it opened the camera. This records that
 * intent before the camera launches, so the result can be routed to the
 * right place afterwards.
 *
 * Written before the camera opens and cleared once the result is handled,
 * so a stale intent can never hijack an unrelated capture.
 */
export type CapturePurpose =
  | 'check-in-selfie'
  | 'ride-proof'
  | 'part-bill'
  | 'job-photo'
  | 'product-video';

export interface CaptureIntent {
  purpose: CapturePurpose;
  callId: string;
  /** Extra context the handler needs, e.g. the product photo category. */
  detail?: string;
  startedAt: string;
}

const KEY = 'pending_capture_intent';

/**
 * An intent older than this is assumed abandoned. Without it, a capture the
 * engineer cancelled days ago could fire on some unrelated launch.
 */
const MAX_AGE_MS = 30 * 60 * 1000;

export const captureIntent = {
  async set(intent: Omit<CaptureIntent, 'startedAt'>): Promise<void> {
    try {
      await SecureStore.setItemAsync(
        KEY,
        JSON.stringify({ ...intent, startedAt: new Date().toISOString() })
      );
    } catch {
      // Storage is a convenience here: failing to record the intent only
      // costs the recovery path, and must never block taking the photo.
    }
  },

  async get(): Promise<CaptureIntent | null> {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      if (!raw) return null;

      const intent = JSON.parse(raw) as CaptureIntent;
      const age = Date.now() - new Date(intent.startedAt).getTime();
      if (!Number.isFinite(age) || age > MAX_AGE_MS) {
        await captureIntent.clear();
        return null;
      }
      return intent;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(KEY);
    } catch {
      // Nothing to do — a stale entry ages out on the next read.
    }
  },
};
