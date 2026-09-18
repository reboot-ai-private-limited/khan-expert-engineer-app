import React from 'react';
import { StepScreen } from '@/components/calls/StepScreen';
import { CheckInOutCard } from '@/components/calls/CheckInOutCard';

/** Step 2 — selfie and GPS on arrival. */
export default function CheckInStepScreen() {
  return (
    <StepScreen stepKey="check-in" canContinue={(call) => Boolean(call.checkIn)}>
      {(call, applyUpdate) => <CheckInOutCard call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}
