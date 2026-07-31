import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HatcheryStackParamList } from "../../navigation/types";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<HatcheryStackParamList, "HatcheryHome">;

const MENU: {
  key: "Broodstock" | "HatcheryBatches" | "Trays";
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof AppIcon>["name"];
}[] = [
  { key: "Broodstock", title: "Broodstock", subtitle: "Raceways housing broodstock, photoperiod, stripping plans", icon: "sunrise" },
  { key: "HatcheryBatches", title: "Egg & fingerling batches", subtitle: "Track eggs from stripping through to fingerling sale", icon: "activity" },
  { key: "Trays", title: "Trays", subtitle: "Incubation trays this hatchery uses", icon: "grid" },
];

export function HatcheryHomeScreen({ navigation }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.eyebrow}>HATCHERY</Text>
          <Text style={styles.heroTitle}>Broodstock to fingerling</Text>
          <Text style={styles.heroText}>Track every stage with confidence.</Text>
        </View>
        <AppIcon name="sunrise" size={28} color="#D5E8E5" />
      </View>

      {MENU.map((item) => (
        <TouchableOpacity key={item.key} onPress={() => navigation.navigate(item.key)}>
          <Card>
            <View style={styles.row}>
              <View style={styles.icon}><AppIcon name={item.icon} size={20} color={colors.teal} /></View>
              <View style={styles.textColumn}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
              <AppIcon name="chevron-right" />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  hero: { backgroundColor: colors.ocean, borderRadius: 22, padding: 20, flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  eyebrow: { color: "#BBD9D5", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: "800", marginTop: 4 },
  heroText: { color: "#D5E8E5", fontSize: 13, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.tealSoft, justifyContent: "center", alignItems: "center", marginRight: 14 },
  textColumn: { flex: 1 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 3 },
});
