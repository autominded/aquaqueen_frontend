import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "./Card";
import { useUnits } from "../context/UnitsContext";
import { colors, radii } from "../theme";

interface Props {
  title?: string;
  subtitle?: string;
  // ProfileScreen shows its own expandable header (title + subtitle) above
  // this card, so it doesn't need a duplicate one here.
  showHeader?: boolean;
}

export function UnitPreferenceCard({
  title = "Display units",
  subtitle = "Pick each independently — mix and match to how your farm actually measures things.",
  showHeader = true,
}: Props) {
  const { massUnit, setMassUnit, lengthUnit, setLengthUnit, weightUnit, setWeightUnit } = useUnits();

  return (
    <Card style={styles.card}>
      {showHeader && (
        <>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </>
      )}

      <Text style={[styles.groupLabel, !showHeader && styles.groupLabelFirst]}>Biomass & feed weight</Text>
      <View style={styles.choices}>
        <UnitChoice label="Kilograms" detail="kg" active={massUnit === "kg"} onPress={() => setMassUnit("kg")} />
        <UnitChoice label="Pounds" detail="lb" active={massUnit === "lb"} onPress={() => setMassUnit("lb")} />
      </View>

      <Text style={styles.groupLabel}>Raceway dimensions</Text>
      <View style={styles.choices}>
        <UnitChoice label="Metres" detail="m" active={lengthUnit === "m"} onPress={() => setLengthUnit("m")} />
        <UnitChoice label="Centimetres" detail="cm" active={lengthUnit === "cm"} onPress={() => setLengthUnit("cm")} />
        <UnitChoice label="Feet" detail="ft" active={lengthUnit === "ft"} onPress={() => setLengthUnit("ft")} />
      </View>

      <Text style={styles.groupLabel}>Per-fish weight</Text>
      <View style={styles.choices}>
        <UnitChoice label="Grams" detail="g" active={weightUnit === "g"} onPress={() => setWeightUnit("g")} />
        <UnitChoice label="Ounces" detail="oz" active={weightUnit === "oz"} onPress={() => setWeightUnit("oz")} />
      </View>
    </Card>
  );
}

function UnitChoice({ label, detail, active, onPress }: { label: string; detail: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceLabel, active && styles.choiceLabelActive]}>{label}</Text>
      <Text style={[styles.choiceDetail, active && styles.choiceDetailActive]}>{detail}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 0 },
  title: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  subtitle: { color: colors.inkMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  groupLabel: { color: colors.ink, fontSize: 12, fontWeight: "700", marginTop: 16 },
  groupLabelFirst: { marginTop: 0 },
  choices: { flexDirection: "row", gap: 8, marginTop: 8 },
  choice: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, padding: 12 },
  choiceActive: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  choiceLabel: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  choiceLabelActive: { color: colors.tealDark },
  choiceDetail: { color: colors.inkMuted, fontSize: 11, marginTop: 3 },
  choiceDetailActive: { color: colors.tealDark },
});
