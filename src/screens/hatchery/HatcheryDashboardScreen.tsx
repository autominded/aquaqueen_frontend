import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createHatcheryBatch, fetchHatcheryBatches, updateHatcheryBatch } from "../../api/hatchery";
import { HatcheryStage } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";

const STAGES: HatcheryStage[] = ["EGG", "EYED", "HATCHED", "FRY"];
const NEXT_STAGE: Record<HatcheryStage, HatcheryStage | null> = {
  EGG: "EYED",
  EYED: "HATCHED",
  HATCHED: "FRY",
  FRY: null,
};

export function HatcheryDashboardScreen() {
  const queryClient = useQueryClient();
  const batchesQuery = useQuery({ queryKey: ["hatchery-batches"], queryFn: fetchHatcheryBatches });

  const [species, setSpecies] = useState("");
  const [eggCount, setEggCount] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedHatchDate, setExpectedHatchDate] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createHatcheryBatch({ species: species.trim(), eggCount: Number(eggCount), startDate, expectedHatchDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hatchery-batches"] });
      setSpecies("");
      setEggCount("");
      setExpectedHatchDate("");
    },
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: HatcheryStage }) => updateHatcheryBatch(id, { stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hatchery-batches"] }),
  });

  const canSubmit = species && Number(eggCount) > 0 && startDate && expectedHatchDate;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>New hatchery batch</Text>
      {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
      <FormField label="Species" value={species} onChangeText={setSpecies} placeholder="Rainbow Trout" />
      <FormField label="Egg count" value={eggCount} onChangeText={setEggCount} keyboardType="numeric" placeholder="20000" />
      <FormField label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
      <FormField label="Expected hatch date (YYYY-MM-DD)" value={expectedHatchDate} onChangeText={setExpectedHatchDate} placeholder="2026-08-01" />
      <PrimaryButton title="Create hatchery batch" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} />

      <Text style={styles.sectionTitle}>Active hatchery batches</Text>
      {batchesQuery.isPending && <LoadingView />}
      {batchesQuery.isError && <ErrorBanner message={apiErrorMessage(batchesQuery.error)} onRetry={batchesQuery.refetch} />}
      {batchesQuery.data?.length === 0 && <EmptyState title="No hatchery batches yet" subtitle="Log your first egg batch above." />}
      {batchesQuery.data?.map((batch) => {
        const nextStage = NEXT_STAGE[batch.stage];
        return (
          <Card key={batch.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.entryTitle}>{batch.species}</Text>
              <Text style={styles.status}>{batch.stage}</Text>
            </View>
            <Text style={styles.meta}>{batch.eggCount.toLocaleString()} eggs · expected hatch {new Date(batch.expectedHatchDate).toDateString()}</Text>
            {nextStage && batch.status === "ACTIVE" && (
              <PrimaryButton
                title={`Advance to ${nextStage}`}
                variant="secondary"
                onPress={() => advanceMutation.mutate({ id: batch.id, stage: nextStage })}
                style={styles.advanceButton}
              />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1c2424", marginTop: 12, marginBottom: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  entryTitle: { fontSize: 14, fontWeight: "600", color: "#1c2424" },
  status: { fontSize: 12, fontWeight: "700", color: "#0b6e6e" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
  advanceButton: { marginTop: 10 },
});
