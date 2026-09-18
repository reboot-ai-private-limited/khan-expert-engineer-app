import React from 'react';
import { StepScreen } from '@/components/calls/StepScreen';
import { RideCard } from '@/components/calls/RideCard';

/** Step 1 — the journey to the job, recorded before arrival. */
export default function RideStepScreen() {
  return (
    <StepScreen stepKey="ride" canContinue={(call) => Boolean(call.ride)}>
      {(call, applyUpdate) => <RideCard call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}
