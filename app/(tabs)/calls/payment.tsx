import React from 'react';
import { StepScreen } from '@/components/calls/StepScreen';
import { PaymentCollectionCard } from '@/components/calls/PaymentCollectionCard';

/** Step 9 — what was collected, and how. Posts to the engineer's wallet. */
export default function PaymentStepScreen() {
  return (
    <StepScreen stepKey="payment" canContinue={(call) => Boolean(call.paymentCollected)}>
      {(call, applyUpdate) => <PaymentCollectionCard call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}
