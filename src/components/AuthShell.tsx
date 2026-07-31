import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppIcon } from "./AppIcon";
import { colors, radii } from "../theme";

export function AuthShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.logo}><AppIcon name="activity" size={24} color={colors.white} /></View>
        <Text style={styles.brand}>AquaQueen</Text>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.panel}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ocean }, hero: { paddingHorizontal: 24, paddingTop: 48, paddingBottom: 36 },
  logo: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.teal, marginBottom: 18 }, brand: { color: colors.white, fontSize: 15, fontWeight: "800", marginBottom: 26 },
  eyebrow: { color: "#A8D9D3", fontSize: 11, letterSpacing: 1.2, fontWeight: "800" }, title: { color: colors.white, fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.7, marginTop: 7 }, subtitle: { color: "#D5E8E5", fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 310 },
  panel: { flex: 1, backgroundColor: colors.canvas, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, padding: 24 },
});
