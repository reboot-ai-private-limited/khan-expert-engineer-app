import React from 'react';
import { View } from 'react-native';
import { StepScreen } from '@/components/calls/StepScreen';
import { PhotoGrid } from '@/components/calls/PhotoGrid';
import { ProductVideoSlot } from '@/components/calls/ProductVideoSlot';
import { spacing } from '@/theme';

/**
 * Step 6 — optional evidence gallery, shared by any checklist step that
 * wants a photo. Also offers a short video, through the same
 * `service_videos` list and record/upload flow the product-verification
 * step uses — one video gallery, reachable from wherever it's relevant,
 * rather than a second one built from scratch.
 */
export default function PhotosStepScreen() {
  return (
    <StepScreen stepKey="photos">
      {(call, applyUpdate) => (
        <View style={{ gap: spacing.xl }}>
          <PhotoGrid
            callId={call._id}
            images={call.service_images ?? []}
            onImagesChange={(next) => applyUpdate({ ...call, service_images: next })}
          />
          <ProductVideoSlot call={call} onUpdated={applyUpdate} />
        </View>
      )}
    </StepScreen>
  );
}
