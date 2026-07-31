import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HatcheryStackParamList } from "../../navigation/types";
import { createHatcheryBatch, fetchHatcheryBatches, updateHatcheryBatch } from "../../api/hatchery";
import { fetchBroodstocks } from "../../api/broodstock";
import { fetchTrays } from "../../api/trays";
import { HatcheryStage } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { apiErrorMessage } from "../../api/client";
import { AppIcon } from "../../components/AppIcon";
import { StatusPill } from "../../components/StatusPill";
import { useRefreshing } from "../../lib/useRefreshing";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<HatcheryStackParamList, "HatcheryBatches">;

const NEXT_STAGE: Record<HatcheryStage, HatcheryStage | null> = {
  EGG: "EYED",
  EYED: "HATCHED",
  HATCHED: "FRY",
  FRY: null,
};

export function HatcheryBatchesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const batchesQuery = useQuery({ queryKey: ["hatchery-batches"], queryFn: fetchHatcheryBatches });
  const broodstockQuery = useQuery({ queryKey: ["broodstocks"], queryFn: fetchBroodstocks });
  const traysQuery = useQuery({ queryKey: ["trays"], queryFn: fetchTrays });
  const { refreshing, onRefresh } = useRefreshing();

  const [species, setSpecies] = useState("");
  const [eggCount, setEggCount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedHatchDate, setExpectedHatchDate] = useState("");
  const [broodstockId, setBroodstockId] = useState<string | undefined>(undefined);
  const [trayId, setTrayId] = useState<string | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: () =>
      createHatcheryBatch({
        species: species.trim(),
        eggCount: Number(eggCount),
        startDate,
        expectedHatchDate,
        broodstockId,
        trayId,
        strippingDate: broodstockId ? startDate : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hatchery-batches"] });
      setSpecies("");
      setEggCount("");
      setExpectedHatchDate("");
      setBroodstockId(undefined);
      setTrayId(undefined);
    },
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: HatcheryStage }) => updateHatcheryBatch(id, { stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hatchery-batches"] }),
  });

  const canSubmit = species && Number(eggCount) > 0 && startDate && expectedHatchDate;

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={styles.sectionTitle}>Start a new batch</Text>
      {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
      <FormField label="Species" value={species} onChangeText={setSpecies} placeholder="Rainbow Trout" />
      <FormField label="Egg count" value={eggCount} onChangeText={setEggCount} keyboardType="numeric" placeholder="20000" />
      <DateField label="Start date" value={startDate} onChange={setStartDate} />
      <DateField label="Expected hatch date" value={expectedHatchDate} onChange={setExpectedHatchDate} />
      <SelectField
        label="From broodstock (optional)"
        value={broodstockId ?? null}
        onSelect={setBroodstockId}
        placeholder="Not linked to a stripping"
        options={(broodstockQuery.data ?? []).map((b) => ({ value: b.id, label: `${b.raceway?.name ?? "Raceway"} · ${b.species}` }))}
      />
      <SelectField
        label="Tray (optional)"
        value={trayId ?? null}
        onSelect={setTrayId}
        placeholder="Not assigned yet"
        options={(traysQuery.data ?? []).map((t) => ({ value: t.id, label: t.name }))}
      />
      <PrimaryButton title="Create hatchery batch" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} />

      <Text style={styles.sectionTitle}>Active hatchery batches</Text>
      {batchesQuery.isPending && <LoadingView />}
      {batchesQuery.isError && <ErrorBanner message={apiErrorMessage(batchesQuery.error)} onRetry={batchesQuery.refetch} />}
      {batchesQuery.data?.length === 0 && <EmptyState title="No hatchery batches yet" subtitle="Log your first egg batch above." />}
      {batchesQuery.data?.map((batch) => {
        const nextStage = NEXT_STAGE[batch.stage];
        return (
          <TouchableOpacity key={batch.id} onPress={() => navigation.navigate("HatcheryBatchDetail", { hatcheryBatchId: batch.id })}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.entryTitle}>{batch.species}</Text>
                <StatusPill label={batch.stage} tone="neutral" />
              </View>
              <Text style={styles.meta}>
                {batch.currentCount.toLocaleString()} of {batch.eggCount.toLocaleString()} eggs · expected hatch {new Date(batch.expectedHatchDate).toDateString()}
              </Text>
              {batch.tray && <Text style={styles.meta}>Tray: {batch.tray.name}</Text>}
              {nextStage && batch.status === "ACTIVE" && (
                <PrimaryButton
                  title={`Advance to ${nextStage}`}
                  variant="secondary"
                  onPress={() => advanceMutation.mutate({ id: batch.id, stage: nextStage })}
                  style={styles.advanceButton}
                />
              )}
            </Card>
          </TouchableOpacity>
        );
      })}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ocean, marginTop: 14, marginBottom: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  advanceButton: { marginTop: 10 },
});
