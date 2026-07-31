import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card } from "./Card";
import { FormField } from "./FormField";
import { RacewayDraft } from "../api/farm";

interface Props {
  raceways: RacewayDraft[];
  onChange: (raceways: RacewayDraft[]) => void;
  lengthUnitLabel: "m" | "ft";
}

// Mirrors PaymentSplitEditor's controlled-array-prop pattern: the parent
// (FarmSetupScreen) keeps `raceways` in state and resizes the array whenever
// the "number of raceways" count field changes; this component just renders
// one editable card per entry. Values are in whatever unit the parent seeded
// them with (see FarmSetupScreen's METRIC/IMPERIAL conversion at load/save time) —
// this component just labels the fields, it doesn't convert anything itself.
export function RacewayListEditor({ raceways, onChange, lengthUnitLabel }: Props) {
  const updateField = (index: number, field: keyof RacewayDraft, value: string) => {
    onChange(raceways.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  if (raceways.length === 0) {
    return null;
  }

  return (
    <View>
      {raceways.map((raceway, index) => (
        <Card key={index} style={styles.card}>
          <Text style={styles.title}>Raceway {index + 1}</Text>
          <FormField
            label="Name"
            value={raceway.name}
            onChangeText={(v) => updateField(index, "name", v)}
            placeholder={`Raceway ${index + 1}`}
          />
          <View style={styles.dimensionsRow}>
            <View style={styles.dimensionField}>
              <FormField
                label={`Length (${lengthUnitLabel})`}
                value={raceway.lengthM}
                onChangeText={(v) => updateField(index, "lengthM", v)}
                keyboardType="numeric"
                placeholder="10"
              />
            </View>
            <View style={styles.dimensionField}>
              <FormField
                label={`Width (${lengthUnitLabel})`}
                value={raceway.widthM}
                onChangeText={(v) => updateField(index, "widthM", v)}
                keyboardType="numeric"
                placeholder="3"
              />
            </View>
            <View style={styles.dimensionField}>
              <FormField
                label={`Depth (${lengthUnitLabel})`}
                value={raceway.depthM}
                onChangeText={(v) => updateField(index, "depthM", v)}
                keyboardType="numeric"
                placeholder="1.5"
              />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 0 },
  title: { fontSize: 14, fontWeight: "700", color: "#1c2424", marginBottom: 10 },
  dimensionsRow: { flexDirection: "row", gap: 8 },
  dimensionField: { flex: 1 },
});
