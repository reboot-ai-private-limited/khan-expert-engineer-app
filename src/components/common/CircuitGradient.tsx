import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '@/theme';

interface CircuitGradientProps {
  style?: ViewStyle;
}

/**
 * Brand gradient with a faint circuit-board tracery, echoing the app icon.
 * Fills its parent — the parent controls size and corner rounding
 * (set `overflow: 'hidden'` + border radii there).
 */
export const CircuitGradient: React.FC<CircuitGradientProps> = ({ style }) => (
  <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
    <Svg width="100%" height="100%" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.brandDark} />
          <Stop offset="1" stopColor={colors.brand} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="400" height="400" fill="url(#bg)" />

      <Line x1="40" y1="60" x2="40" y2="130" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.16" />
      <Line x1="40" y1="130" x2="110" y2="130" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.16" />
      <Circle cx="40" cy="60" r="3" fill="#FFFFFF" opacity="0.24" />
      <Circle cx="110" cy="130" r="3" fill="#FFFFFF" opacity="0.24" />

      <Line x1="360" y1="40" x2="360" y2="90" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.16" />
      <Line x1="360" y1="90" x2="300" y2="90" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.16" />
      <Circle cx="360" cy="40" r="2.5" fill="#FFFFFF" opacity="0.22" />
      <Circle cx="300" cy="90" r="2.5" fill="#FFFFFF" opacity="0.22" />

      <Line x1="330" y1="320" x2="370" y2="320" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.14" />
      <Line x1="330" y1="320" x2="330" y2="370" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.14" />
      <Circle cx="370" cy="320" r="3" fill="#FFFFFF" opacity="0.2" />

      <Line x1="30" y1="300" x2="70" y2="300" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.14" />
      <Circle cx="30" cy="300" r="2.5" fill="#FFFFFF" opacity="0.2" />
    </Svg>
  </View>
);
