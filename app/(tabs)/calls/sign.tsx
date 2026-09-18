import React from 'react';
import { StepScreen } from '@/components/calls/StepScreen';
import { CustomerSignatureCard } from '@/components/calls/CustomerSignatureCard';

/**
 * Step 8 — the customer signs. The pad itself is a separate full-screen
 * route (`signature.tsx`) so there is real room to write; this step is the
 * entry point and the captured-signature summary.
 */
export default function SignStepScreen() {
  return (
    <StepScreen stepKey="signature" canContinue={(call) => Boolean(call.customerSignature)}>
      {(call) => <CustomerSignatureCard call={call} />}
    </StepScreen>
  );
}
