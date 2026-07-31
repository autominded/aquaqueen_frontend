import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { RacewayOverview } from "../api/types";
import { AppIcon } from "./AppIcon";
import { colors, radii } from "../theme";
import { useUnits } from "../context/UnitsContext";

const POND_WIDTH = 208;
const POND_HEIGHT = 96;

export function RacewayCard({ raceway }: { raceway: RacewayOverview }) {
  const { formatLength, formatMass } = useUnits();

  return (
    <View style={styles.card}>
      <View style={styles.pond}>
        <View style={styles.waterSurface} />
        <View style={styles.pondLabel}>
          <Text style={styles.pondName} numberOfLines={1}>{raceway.name}</Text>
          <Text style={styles.pondDims}>
            {formatLength(raceway.lengthM)} × {formatLength(raceway.widthM)} · {formatLength(raceway.depthM)} deep
          </Text>
        </View>
        <View style={styles.rippleIcon}><AppIcon name="wind" size={14} color="rgba(255,255,255,0.55)" /></View>
      </View>

      <View style={styles.statsRow}>
        <Stat icon="activity" value={raceway.fishCount.toLocaleString()} label="Fish" />
        <Stat icon="anchor" value={formatMass(raceway.biomassKg)} label="Biomass" />
      </View>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: React.ComponentProps<typeof AppIcon>["name"]; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppIcon name={icon} size={14} color={colors.teal} />
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: POND_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  pond: {
    height: POND_HEIGHT,
    backgroundColor: colors.ocean,
    justifyContent: "flex-end",
    padding: 12,
  },
  waterSurface: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "38%",
    backgroundColor: colors.teal,
    opacity: 0.55,
  },
  rippleIcon: { position: "absolute", top: 10, right: 10 },
  pondLabel: {},
  pondName: { color: colors.white, fontWeight: "800", fontSize: 15 },
  pondDims: { color: "#D5E8E5", fontSize: 11, marginTop: 2 },
  statsRow: { flexDirection: "row", padding: 10 },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statValue: { fontSize: 13, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 10, color: colors.inkMuted },
});
