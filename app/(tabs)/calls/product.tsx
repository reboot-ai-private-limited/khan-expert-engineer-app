import React from 'react';
import { StepScreen } from '@/components/calls/StepScreen';
import { ProductVerificationCard } from '@/components/calls/ProductVerificationCard';

/** Step 3 — photograph the unit, correct its details, settle the warranty. */
export default function ProductStepScreen() {
  return (
    <StepScreen stepKey="product" canContinue={(call) => Boolean(call.warrantyStatus)}>
      {(call, applyUpdate) => <ProductVerificationCard call={call} onUpdated={applyUpdate} />}
    </StepScreen>
  );
}
