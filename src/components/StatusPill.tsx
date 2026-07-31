import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../theme";

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "success" | "warning" | "critical" }) {
  return (
    <View style={[styles.pill, styles[tone]]}>
      <Text style={[styles.label, styles[`${tone}Label`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: "flex-start", borderRadius: radii.pill, paddingHorizontal: 9, paddingVertical: 5 },
  neutral: { backgroundColor: colors.tealSoft },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.amberSoft },
  critical: { backgroundColor: colors.coralSoft },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  neutralLabel: { color: colors.tealDark },
  successLabel: { color: colors.success },
  warningLabel: { color: colors.amber },
  criticalLabel: { color: colors.coral },
});
