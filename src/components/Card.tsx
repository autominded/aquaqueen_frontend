import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radii, shadows } from "../theme";

// StyleProp rather than a bare ViewStyle, so callers can pass the usual
// `[base, condition && variant]` array. Every other RN component accepts one;
// a bare ViewStyle quietly forces callers to spread objects by hand instead.
// Strictly a widening — no existing caller is affected.
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
});
