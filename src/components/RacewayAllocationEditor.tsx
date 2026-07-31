import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Raceway } from "../api/types";
import { SelectField } from "./SelectField";
import { colors, radii } from "../theme";

export interface RacewayAllocationLine {
  racewayId: string;
  count: string;
}

interface Props {
  raceways: Raceway[];
  lines: RacewayAllocationLine[];
  onChange: (lines: RacewayAllocationLine[]) => void;
  targetCount: number;
}

// Splits a new batch's initial fish count across one or more raceways —
// mirrors FeedItemsEditor's per-line + running-total pattern, but the
// "total" here has to land on an exact target (every fingerling has to go
// somewhere) rather than just being informational.
export function RacewayAllocationEditor({ raceways, lines, onChange, targetCount }: Props) {
  const updateLine = (index: number, patch: Partial<RacewayAllocationLine>) => {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    const usedIds = new Set(lines.map((l) => l.racewayId));
    const next = raceways.find((r) => !usedIds.has(r.id)) ?? raceways[0];
    if (!next) return;
    onChange([...lines, { racewayId: next.id, count: "" }]);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  if (raceways.length === 0) {
    return null;
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.count) || 0), 0);
  const remaining = targetCount - total;

  return (
    <View>
      {lines.map((line, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Raceway {index + 1}</Text>
            {lines.length > 1 && (
              <TouchableOpacity onPress={() => removeLine(index)}>
                <Text style={styles.removeLink}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <SelectField
            label="Raceway"
            value={line.racewayId}
            onSelect={(racewayId) => updateLine(index, { racewayId })}
            options={raceways
              .filter((r) => r.id === line.racewayId || !lines.some((l) => l.racewayId === r.id))
              .map((r) => ({ value: r.id, label: r.name }))}
          />

          <Text style={styles.fieldLabel}>Fish count</Text>
          <TextInput
            style={styles.input}
            value={line.count}
            onChangeText={(v) => updateLine(index, { count: v })}
            keyboardType="numeric"
            placeholder="80000"
            placeholderTextColor={colors.inkMuted}
          />
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Allocated</Text>
        <Text style={[styles.totalValue, remaining !== 0 && styles.totalValueOff]}>
          {total.toLocaleString()} / {targetCount.toLocaleString()}
        </Text>
      </View>
      {remaining !== 0 && targetCount > 0 && (
        <Text style={styles.remainingHint}>
          {remaining > 0 ? `${remaining.toLocaleString()} fish not yet assigned to a raceway` : `${Math.abs(remaining).toLocaleString()} more than the initial fish count`}
        </Text>
      )}

      <TouchableOpacity onPress={addLine} disabled={lines.length >= raceways.length}>
        <Text style={[styles.addLink, lines.length >= raceways.length && styles.addLinkDisabled]}>+ Add another raceway</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  removeLink: { fontSize: 12, fontWeight: "700", color: colors.coral },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.canvas,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginBottom: 4 },
  totalLabel: { fontSize: 14, fontWeight: "800", color: colors.ink },
  totalValue: { fontSize: 14, fontWeight: "800", color: colors.teal },
  totalValueOff: { color: colors.coral },
  remainingHint: { fontSize: 12, color: colors.coral, marginBottom: 8 },
  addLink: { fontSize: 13, fontWeight: "700", color: colors.teal, marginBottom: 8 },
  addLinkDisabled: { color: colors.inkMuted },
});
