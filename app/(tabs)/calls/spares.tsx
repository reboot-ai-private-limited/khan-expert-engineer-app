import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StepScreen } from '@/components/calls/StepScreen';
import { SpareRequestCard } from '@/components/calls/SpareRequestCard';
import { SelfPurchaseCard } from '@/components/calls/SelfPurchaseCard';
import { spacing } from '@/theme';

/**
 * Step 5 — optional. Two ways a missing part gets solved:
 *   - ask the office for one from a godown (SpareRequestCard), or
 *   - buy it yourself at a nearby shop (SelfPurchaseCard).
 */
export default function SparesStepScreen() {
  return (
    <StepScreen stepKey="spares">
      {(call, applyUpdate) => (
        <View style={styles.block}>
          <SpareRequestCard call={call} onCallUpdated={applyUpdate} />
          <SelfPurchaseCard call={call} onUpdated={applyUpdate} />
        </View>
      )}
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.lg,
  },
});
