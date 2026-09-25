import React from 'react';
import { router } from 'expo-router';
import { Button } from '@/components/common/Button';
import { CollapsibleSection } from '@/components/common/CollapsibleSection';
import { Notice } from '@/components/feedback/Notice';
import type { EngineerCall } from '@/types/call';

interface CustomerSignatureCardProps {
  call: EngineerCall;
}

/**
 * Customer confirmation before completion — on-screen signature, not OTP
 * (decided (owner), works offline). Signing itself happens on a full-screen
 * route (`(tabs)/calls/signature.tsx`) so the customer has real room to
 * write — this card is just the entry point and the "done" summary.
 */
export const CustomerSignatureCard: React.FC<CustomerSignatureCardProps> = ({ call }) => {
  const openPad = () => router.push({ pathname: '/(tabs)/calls/signature', params: { callId: call._id } });

  if (call.customerSignature) {
    return (
      <CollapsibleSection title="Customer signature" summary="Captured">
        <Notice tone="success" message={`Signed ${new Date(call.customerSignature.capturedAt).toLocaleString()}`} />
        {/* A slip of the finger, or the customer wants to sign properly —
            the new signature replaces this one. Gone once the job is done. */}
        <Button label="Sign again" variant="ghost" onPress={openPad} />
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Customer signature" summary="Not captured yet — tap to sign" defaultExpanded>
      <Button label="Open signature pad" onPress={openPad} />
    </CollapsibleSection>
  );
};
