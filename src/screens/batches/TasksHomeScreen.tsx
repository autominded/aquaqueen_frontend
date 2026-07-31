import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "TasksHome">;

const SECTIONS: { screen: keyof BatchesStackParamList; icon: React.ComponentProps<typeof AppIcon>["name"]; title: string; hint: string }[] = [
  { screen: "DailyTasks", icon: "check-square", title: "Daily tasks", hint: "One-off or recurring day-to-day work" },
  { screen: "CleaningTasks", icon: "droplet", title: "Farm cleaning", hint: "Cleaning schedule with a per-task checklist" },
  { screen: "WaterChangeTasks", icon: "refresh-cw", title: "Water changes", hint: "Schedule and log water change rounds" },
  { screen: "RepairTasks", icon: "tool", title: "Repairs", hint: "Track repair work by priority" },
  { screen: "StockTransfers", icon: "shuffle", title: "Grading & stock transfer", hint: "Move fish between raceways or batches" },
];

export function TasksHomeScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {SECTIONS.map((s) => (
        <TouchableOpacity key={s.screen} onPress={() => navigation.navigate(s.screen as any)}>
          <Card style={styles.card}>
            <View style={styles.icon}><AppIcon name={s.icon} size={18} color={colors.teal} /></View>
            <View style={styles.copy}>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.hint}>{s.hint}</Text>
            </View>
            <AppIcon name="chevron-right" />
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 40 },
  card: { marginHorizontal: 0, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  hint: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
});
