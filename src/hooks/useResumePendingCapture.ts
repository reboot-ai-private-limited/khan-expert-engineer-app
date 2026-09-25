import { useEffect } from 'react';
import { router, useRootNavigationState } from 'expo-router';
import { captureIntent, type CapturePurpose } from '@/services/storage/captureIntent';

/**
 * Takes the engineer back to the screen a photo was being taken for, after
 * Android killed the app behind the camera.
 *
 * Each screen already recovers its own photo (usePendingCapture), but only
 * once it is open again — and after the restart the engineer lands on the
 * job list, with no idea where the photo went. This reopens that screen, so
 * its recovery runs and the photo appears where they left it.
 *
 * Does not touch the intent itself: the screen's own recovery reads and
 * clears it. An intent older than 30 minutes is already ignored by
 * captureIntent.get().
 */
const JOB_STEP_ROUTE: Partial<Record<CapturePurpose, string>> = {
  'check-in-selfie': '/(tabs)/calls/check-in',
  'ride-proof': '/(tabs)/calls/ride',
  'part-bill': '/(tabs)/calls/spares',
  'job-photo': '/(tabs)/calls/product',
  'product-video': '/(tabs)/calls/product',
  'work-photo': '/(tabs)/calls/photos',
  'payment-proof': '/(tabs)/calls/payment',
};

const PROFILE_ROUTE: Partial<Record<CapturePurpose, string>> = {
  'kyc-photo': '/(tabs)/profile/kyc',
  'id-card-photo': '/(tabs)/profile/id-cards',
  'skill-certificate': '/(tabs)/profile/skills',
};

/** Photo slots that live on a form the restart already wiped — reopening it would recover a photo with nothing around it. */
const NOT_RESUMABLE_IDS = new Set(['advance-receipt']);

// Once per app launch — never again after the engineer has moved on.
let attempted = false;

export const useResumePendingCapture = (): void => {
  const navState = useRootNavigationState();
  const ready = Boolean(navState?.key);

  useEffect(() => {
    if (!ready || attempted) return;
    attempted = true;

    void (async () => {
      const intent = await captureIntent.get();
      if (!intent || NOT_RESUMABLE_IDS.has(intent.callId)) return;

      const stepRoute = JOB_STEP_ROUTE[intent.purpose];
      if (stepRoute) {
        router.push({ pathname: stepRoute as never, params: { callId: intent.callId } as never });
        return;
      }
      const profileRoute = PROFILE_ROUTE[intent.purpose];
      if (profileRoute) router.push(profileRoute as never);
    })();
  }, [ready]);
};
