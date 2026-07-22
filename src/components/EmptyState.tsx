import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "600", color: "#3f4a4a", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#7a8787", textAlign: "center" },
});
