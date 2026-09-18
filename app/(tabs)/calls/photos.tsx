import React from 'react';
import { StepScreen } from '@/components/calls/StepScreen';
import { PhotoGrid } from '@/components/calls/PhotoGrid';

/** Step 6 — optional evidence gallery, shared by any checklist step that wants a photo. */
export default function PhotosStepScreen() {
  return (
    <StepScreen stepKey="photos">
      {(call, applyUpdate) => (
        <PhotoGrid
          callId={call._id}
          images={call.service_images ?? []}
          onImagesChange={(next) => applyUpdate({ ...call, service_images: next })}
        />
      )}
    </StepScreen>
  );
}
