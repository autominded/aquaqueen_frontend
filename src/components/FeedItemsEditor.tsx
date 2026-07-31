import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { PelletSize } from "../api/types";
import { colors, radii } from "../theme";

// bagWeight/numberOfBags/ratePerBag are kept as display-unit strings here —
// same convention as every other form field in the app — the parent screen
// converts bagWeight to/from canonical kg via useUnits() at submit/seed time.
export interface FeedItemLine {
  pelletSizeId: string;
  bagWeight: string;
  numberOfBags: string;
  ratePerBag: string;
}

interface Props {
  pelletSizes: PelletSize[];
  lines: FeedItemLine[];
  onChange: (lines: FeedItemLine[]) => void;
  weightUnitLabel: string;
}

// Cart-style table for a FEED purchase: one row per pellet size, each with
// its own bag weight/count/rate, summing into the purchase total. Mirrors
// PaymentSplitEditor's controlled-array-prop + add/remove-row pattern.
export function FeedItemsEditor({ pelletSizes, lines, onChange, weightUnitLabel }: Props) {
  const updateLine = (index: number, patch: Partial<FeedItemLine>) => {
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    const usedIds = new Set(lines.map((l) => l.pelletSizeId));
    const next = pelletSizes.find((p) => !usedIds.has(p.id)) ?? pelletSizes[0];
    if (!next) return;
    onChange([...lines, { pelletSizeId: next.id, bagWeight: "", numberOfBags: "", ratePerBag: "" }]);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  if (pelletSizes.length === 0) {
    return <Text style={styles.empty}>No pellet sizes configured yet — add them from the super admin Feed catalog screen.</Text>;
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.numberOfBags) || 0) * (Number(l.ratePerBag) || 0), 0);

  return (
    <View>
      {lines.map((line, index) => {
        const lineTotal = (Number(line.numberOfBags) || 0) * (Number(line.ratePerBag) || 0);
        return (
          <View key={index} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Line {index + 1}</Text>
              {lines.length > 1 && (
                <TouchableOpacity onPress={() => removeLine(index)}>
                  <Text style={styles.removeLink}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.fieldLabel}>Pellet size</Text>
            <View style={styles.chipRow}>
              {pelletSizes.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => updateLine(index, { pelletSizeId: p.id })}
                  style={[styles.chip, line.pelletSizeId === p.id && styles.chipActive]}
                >
                  <Text style={[styles.chipText, line.pelletSizeId === p.id && styles.chipTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Bag weight ({weightUnitLabel})</Text>
                <TextInput
                  style={styles.input}
                  value={line.bagWeight}
                  onChangeText={(v) => updateLine(index, { bagWeight: v })}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor={colors.inkMuted}
                />
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>No. of bags</Text>
                <TextInput
                  style={styles.input}
                  value={line.numberOfBags}
                  onChangeText={(v) => updateLine(index, { numberOfBags: v })}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor={colors.inkMuted}
                />
              </View>
              <View style={styles.rowField}>
                <Text style={styles.fieldLabel}>Rate (₹/bag)</Text>
                <TextInput
                  style={styles.input}
                  value={line.ratePerBag}
                  onChangeText={(v) => updateLine(index, { ratePerBag: v })}
                  keyboardType="numeric"
                  placeholder="1200"
                  placeholderTextColor={colors.inkMuted}
                />
              </View>
            </View>

            {lineTotal > 0 && <Text style={styles.lineTotal}>Line total: ₹{lineTotal.toFixed(2)}</Text>}
          </View>
        );
      })}

      {total > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
        </View>
      )}

      <TouchableOpacity onPress={addLine} disabled={lines.length >= pelletSizes.length}>
        <Text style={[styles.addLink, lines.length >= pelletSizes.length && styles.addLinkDisabled]}>+ Add pellet size</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 13, color: colors.inkMuted, marginBottom: 16, lineHeight: 18 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  removeLink: { fontSize: 12, fontWeight: "700", color: colors.coral },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.inkMuted, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: { borderWidth: 1, borderColor: colors.teal, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.teal },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.teal },
  chipTextActive: { color: colors.white },
  row: { flexDirection: "row", gap: 8 },
  rowField: { flex: 1 },
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
  lineTotal: { fontSize: 12, fontWeight: "700", color: colors.teal, marginTop: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginBottom: 12,
  },
  totalLabel: { fontSize: 14, fontWeight: "800", color: colors.ink },
  totalValue: { fontSize: 14, fontWeight: "800", color: colors.teal },
  addLink: { fontSize: 13, fontWeight: "700", color: colors.teal, marginBottom: 8 },
  addLinkDisabled: { color: colors.inkMuted },
});
