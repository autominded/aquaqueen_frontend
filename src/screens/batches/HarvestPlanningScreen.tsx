import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createHarvestPlan, fetchHarvestPlans, updateHarvestPlan } from "../../api/batches";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<BatchesStackParamList, "HarvestPlanning">;

export function HarvestPlanningScreen({ route }: Props) {
  const { batchId } = route.params;
  const queryClient = useQueryClient();

  const plansQuery = useQuery({ queryKey: ["harvest-plans", batchId], queryFn: () => fetchHarvestPlans(batchId) });

  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetWeightG, setTargetWeightG] = useState("");
  const [targetCount, setTargetCount] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      createHarvestPlan(batchId, { plannedDate, targetWeightG: Number(targetWeightG), targetCount: Number(targetCount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvest-plans", batchId] });
      setTargetWeightG("");
      setTargetCount("");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "COMPLETED" | "CANCELLED" }) => updateHarvestPlan(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["harvest-plans", batchId] }),
  });

  const canSubmit = plannedDate && Number(targetWeightG) > 0 && Number(targetCount) > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>New harvest plan</Text>
      {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
      <FormField label="Planned date (YYYY-MM-DD)" value={plannedDate} onChangeText={setPlannedDate} />
      <FormField label="Target avg weight (g)" value={targetWeightG} onChangeText={setTargetWeightG} keyboardType="numeric" placeholder="350" />
      <FormField label="Target count" value={targetCount} onChangeText={setTargetCount} keyboardType="numeric" placeholder="4500" />
      <PrimaryButton title="Create plan" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} />

      <Text style={styles.sectionTitle}>Plans</Text>
      {plansQuery.isPending && <LoadingView />}
      {plansQuery.isError && <ErrorBanner message={apiErrorMessage(plansQuery.error)} onRetry={plansQuery.refetch} />}
      {plansQuery.data?.length === 0 && <EmptyState title="No harvest plans yet" />}
      {plansQuery.data?.map((plan) => (
        <Card key={plan.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.entryTitle}>{new Date(plan.plannedDate).toDateString()}</Text>
            <Text style={styles.status}>{plan.status}</Text>
          </View>
          <Text style={styles.meta}>Target: {plan.targetCount.toLocaleString()} fish @ {plan.targetWeightG}g</Text>
          {plan.status === "PLANNED" && (
            <View style={styles.actionsRow}>
              <PrimaryButton
                title="Mark completed"
                variant="secondary"
                onPress={() => statusMutation.mutate({ id: plan.id, status: "COMPLETED" })}
                style={styles.actionButton}
              />
              <PrimaryButton
                title="Cancel"
                variant="secondary"
                onPress={() => statusMutation.mutate({ id: plan.id, status: "CANCELLED" })}
                style={styles.actionButton}
              />
            </View>
          )}
        </Card>
      ))}
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
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionButton: { flex: 1 },
});
