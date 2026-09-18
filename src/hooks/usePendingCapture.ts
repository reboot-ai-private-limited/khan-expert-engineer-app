import { useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { captureIntent, type CapturePurpose } from '@/services/storage/captureIntent';
import { compressAsset } from '@/utils/imageCapture';

/**
 * Picks up a photo that was taken after Android killed the app.
 *
 * When the camera activity is in front, the system is free to destroy the
 * app behind it — on this device it does so routinely ("has died: hvy
 * LAST"). The photo is still captured; expo-image-picker holds the result
 * and returns it from `getPendingResultAsync()` the next time the app runs.
 *
 * Without this, the engineer takes a selfie, the app "restarts", and the
 * photo is silently gone — which is exactly what check-in looked like.
 *
 * Mount this on a screen that knows how to finish the job the capture was
 * for; it only fires when the recorded intent matches `purpose`.
 */
export const usePendingCapture = (
  purpose: CapturePurpose,
  callId: string | undefined,
  /**
   * Receives a data URI for a photo, or a plain file uri for a video.
   * Video is never turned into a data URI — a clip is tens of megabytes and
   * uploads as multipart straight from its uri.
   */
  onRecovered: (file: string, detail?: string) => void | Promise<void>
): void => {
  // Guards against a second run from a re-render or a fast refresh: the
  // pending result is only handed out once, so a duplicate call would find
  // nothing and could clear a fresh intent.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !callId) return;
    let cancelled = false;

    const recover = async () => {
      const intent = await captureIntent.get();
      if (cancelled || !intent) return;
      if (intent.purpose !== purpose || intent.callId !== callId) return;

      let pending: Awaited<ReturnType<typeof ImagePicker.getPendingResultAsync>>;
      try {
        pending = await ImagePicker.getPendingResultAsync();
      } catch {
        // Nothing recoverable — leave the intent for a later attempt rather
        // than clearing it on a transient failure.
        return;
      }

      if (cancelled || !pending) return;
      handled.current = true;
      await captureIntent.clear();

      // An error result means the capture itself failed, not that we lost it.
      if (!('assets' in pending) || pending.canceled || !pending.assets?.[0]) return;

      try {
        const asset = pending.assets[0];
        // Videos pass through untouched; only photos are resized and encoded.
        const file = asset.type === 'video' ? asset.uri : (await compressAsset(asset)).dataUri;
        if (!cancelled) await onRecovered(file, intent.detail);
      } catch {
        // The file is gone or unreadable; the engineer retakes it.
      }
    };

    void recover();
    return () => {
      cancelled = true;
    };
    // onRecovered is intentionally excluded: callers define it inline, so
    // including it would re-run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purpose, callId]);
};
