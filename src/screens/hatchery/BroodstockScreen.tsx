import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HatcheryStackParamList } from "../../navigation/types";
import { createBroodstock, fetchBroodstocks } from "../../api/broodstock";
import { fetchFarm } from "../../api/farm";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { AppIcon } from "../../components/AppIcon";
import { apiErrorMessage } from "../../api/client";
import { useRefreshing } from "../../lib/useRefreshing";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<HatcheryStackParamList, "Broodstock">;

export function BroodstockScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const broodstockQuery = useQuery({ queryKey: ["broodstocks"], queryFn: fetchBroodstocks });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });
  const raceways = farmQuery.data?.raceways ?? [];
  const { refreshing, onRefresh } = useRefreshing();

  const [adding, setAdding] = useState(false);
  const [racewayId, setRacewayId] = useState<string | undefined>(undefined);
  const [species, setSpecies] = useState("");
  const [count, setCount] = useState("");
  const [stockedDate, setStockedDate] = useState(new Date().toISOString().slice(0, 10));

  const createMutation = useMutation({
    mutationFn: () => createBroodstock({ racewayId: racewayId!, species: species.trim(), count: Number(count), stockedDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broodstocks"] });
      setAdding(false);
      setRacewayId(undefined);
      setSpecies("");
      setCount("");
    },
  });

  const canSubmit = racewayId && species.trim() && Number(count) > 0 && stockedDate;

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      {broodstockQuery.isError && <ErrorBanner message={apiErrorMessage(broodstockQuery.error)} onRetry={broodstockQuery.refetch} />}

      {adding ? (
        <Card style={styles.addCard}>
          {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
          <SelectField
            label="Raceway"
            value={racewayId ?? null}
            onSelect={setRacewayId}
            placeholder="Select a raceway"
            options={raceways.map((r) => ({ value: r.id, label: r.name }))}
          />
          <FormField label="Species" value={species} onChangeText={setSpecies} placeholder="Rainbow Trout" />
          <FormField label="Count" value={count} onChangeText={setCount} keyboardType="numeric" placeholder="40" />
          <DateField label="Stocked date" value={stockedDate} onChange={setStockedDate} />
          <View style={styles.addActions}>
            <PrimaryButton title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={styles.addButton} />
            <PrimaryButton title="Add broodstock" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} style={styles.addButton} />
          </View>
        </Card>
      ) : (
        <TouchableOpacity onPress={() => setAdding(true)}>
          <Text style={styles.addLink}>+ Enlist a raceway for broodstock</Text>
        </TouchableOpacity>
      )}

      {broodstockQuery.isPending && <LoadingView />}
      {broodstockQuery.data?.length === 0 && (
        <EmptyState title="No broodstock enlisted yet" subtitle="Enlist a raceway above to start tracking broodstock." />
      )}
      {broodstockQuery.data?.map((b) => (
        <TouchableOpacity key={b.id} onPress={() => navigation.navigate("BroodstockDetail", { broodstockId: b.id })}>
          <Card style={styles.card}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.title}>{b.raceway?.name ?? "Raceway"}</Text>
                <Text style={styles.meta}>{b.species}</Text>
              </View>
              <View style={styles.countWrap}>
                <Text style={styles.count}>{b.count.toLocaleString()}</Text>
                <Text style={styles.countLabel}>broodstock</Text>
              </View>
              <AppIcon name="chevron-right" />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  addLink: { fontSize: 13, fontWeight: "700", color: colors.teal, marginBottom: 16 },
  addCard: { marginHorizontal: 0, marginBottom: 16 },
  addActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  addButton: { flex: 1 },
  card: { marginHorizontal: 0 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  countWrap: { alignItems: "flex-end", marginRight: 10 },
  count: { fontSize: 16, fontWeight: "800", color: colors.tealDark },
  countLabel: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
});
