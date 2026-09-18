import React, { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/common/Button';
import { colors, radius, spacing, typography } from '@/theme';

interface SignaturePadProps {
  /** Fires once with the finished SVG path data and the canvas size it was drawn at. */
  onDone: (pathData: string, width: number, height: number) => void;
  busy?: boolean;
  /** Fixed pad height for the inline/compact usage. Ignored when `fill` is set. */
  height?: number;
  /** Fills whatever space the parent gives it (used by the full-screen signature route) instead of a fixed height. */
  fill?: boolean;
}

const DEFAULT_PAD_HEIGHT = 200;

/**
 * Captures the customer's on-screen signature as SVG path data — no
 * rasterization, no new native dependency (react-native-svg is already
 * used for the wallet QR). The same path string renders identically here
 * and in the admin panel's plain <svg> tag.
 */
export const SignaturePad: React.FC<SignaturePadProps> = ({ onDone, busy, height = DEFAULT_PAD_HEIGHT, fill = false }) => {
  const [paths, setPaths] = useState<string[]>([]);
  const currentPath = useRef('');
  const [, forceRender] = useState(0);
  const [padWidth, setPadWidth] = useState(0);
  const [padHeight, setPadHeight] = useState(fill ? 0 : height);

  const commitStroke = () => {
    // Capture the finished stroke before clearing the ref — setPaths's
    // updater runs later, during React's commit phase, so reading
    // currentPath.current directly inside it would see the already-cleared
    // value instead of the stroke that was just drawn.
    const finished = currentPath.current;
    if (finished) {
      currentPath.current = '';
      setPaths((prev) => [...prev, finished]);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // The pad sits inside the job screen's ScrollView — without this,
      // Android/iOS can hand the gesture to the ScrollView right as the
      // finger lifts, so the stroke never reaches onPanResponderRelease
      // and just disappears. Refusing the handoff keeps the whole gesture.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        forceRender((n) => n + 1);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        currentPath.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        forceRender((n) => n + 1);
      },
      onPanResponderRelease: commitStroke,
      // Safety net — if something still forces termination, keep the
      // stroke instead of losing it silently.
      onPanResponderTerminate: commitStroke,
    })
  ).current;

  const hasStrokes = paths.length > 0 || currentPath.current.length > 0;

  const clear = () => {
    setPaths([]);
    currentPath.current = '';
    forceRender((n) => n + 1);
  };

  const done = () => {
    if (!hasStrokes || !padWidth || !padHeight) return;
    const combined = [...paths, currentPath.current].filter(Boolean).join(' ');
    onDone(combined, padWidth, padHeight);
  };

  return (
    <View style={[styles.container, fill && styles.containerFill]}>
      <Text style={[typography.caption, styles.hint]}>Hand the phone to the customer to sign below.</Text>
      <View
        style={[styles.pad, fill ? styles.padFill : { height }]}
        onLayout={(e) => {
          setPadWidth(e.nativeEvent.layout.width);
          if (fill) setPadHeight(e.nativeEvent.layout.height);
        }}
        {...panResponder.panHandlers}
      >
        {padWidth > 0 && padHeight > 0 && (
          // pointerEvents="none" — react-native-svg's own native views can
          // otherwise intercept touch dispatch on Android and compete with
          // the outer View's PanResponder for responder status.
          <Svg width={padWidth} height={padHeight} pointerEvents="none">
            {paths.map((d, idx) => (
              <Path key={idx} d={d} stroke={colors.text} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {currentPath.current ? (
              <Path d={currentPath.current} stroke={colors.text} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </Svg>
        )}
        {!hasStrokes ? <Text style={[typography.caption, styles.placeholder]}>Sign here</Text> : null}
      </View>
      <View style={styles.actions}>
        <Button label="Clear" variant="secondary" onPress={clear} style={styles.actionButton} />
        <Button label="Done" onPress={done} loading={busy} disabled={!hasStrokes} style={styles.actionButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  containerFill: {
    flex: 1,
  },
  hint: {
    color: colors.textMuted,
  },
  pad: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  padFill: {
    flex: 1,
  },
  placeholder: {
    color: colors.textFaint,
    position: 'absolute',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
