import * as SecureStore from 'expo-secure-store';
import type { ServiceImageCategory } from '@/types/call';

/**
 * Durable queue for a photo capture that hasn't finished uploading yet.
 *
 * Only lightweight metadata is stored here — the file itself stays wherever
 * the camera already wrote it (`localUri`, in the app's cache directory),
 * which is what makes this safe to persist in SecureStore's small-value
 * store. If the app is killed mid-upload, this entry survives the restart;
 * the caller re-reads the file from `localUri` and retries.
 */
export interface PendingUpload {
  id: string;
  callId: string;
  category: ServiceImageCategory;
  localUri: string;
  mimeType: string;
  createdAt: string;
}

const QUEUE_KEY = 'ket.engineer.pendingUploads';

const safeGetAll = async (): Promise<PendingUpload[]> => {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingUpload[]) : [];
  } catch {
    // A corrupt or unreadable queue is treated as empty — losing retry
    // ability is much better than crashing the job screen on mount.
    return [];
  }
};

const safeSetAll = async (items: PendingUpload[]): Promise<void> => {
  try {
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(items));
  } catch {
    // Best effort — see safeGetAll.
  }
};

export const uploadQueue = {
  async getForCall(callId: string): Promise<PendingUpload[]> {
    return (await safeGetAll()).filter((u) => u.callId === callId);
  },

  /**
   * Called right after the camera returns, before any network request —
   * this is the write that has to land before the app can be killed for
   * the photo to survive.
   */
  async add(item: PendingUpload): Promise<void> {
    const all = await safeGetAll();
    all.push(item);
    await safeSetAll(all);
  },

  async remove(id: string): Promise<void> {
    const all = await safeGetAll();
    await safeSetAll(all.filter((u) => u.id !== id));
  },
};
