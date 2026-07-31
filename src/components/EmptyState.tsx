import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppIcon } from "./AppIcon";
import { colors } from "../theme";

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}><AppIcon name="compass" size={22} color={colors.teal} /></View>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, alignItems: "center" }, icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "800", color: colors.ink, marginBottom: 5 },
  subtitle: { fontSize: 14, color: colors.inkMuted, textAlign: "center", lineHeight: 20 },
});
