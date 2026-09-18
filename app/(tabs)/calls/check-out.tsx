import React from 'react';
import { StepScreen } from '@/components/calls/StepScreen';
import { CheckInOutCard } from '@/components/calls/CheckInOutCard';

/**
 * Step 10 — GPS on departure. Shares CheckInOutCard with the check-in step:
 * the card already renders whichever half of the pair is still outstanding.
 */
export default function CheckOutStepScreen() {
  return (
    <StepScreen stepKey="check-out" canContinue={(call) => Boolean(call.checkOut)}>
      {(call, applyUpdate) => <CheckInOutCard call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}
