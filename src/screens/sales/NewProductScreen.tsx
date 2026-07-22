import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalesStackParamList } from "../../navigation/types";
import { createProduct, fetchCompletedHarvestPlans } from "../../api/pos";
import { HarvestPlanWithBatch, ProductUnit } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<SalesStackParamList, "NewProduct">;

const UNITS: ProductUnit[] = ["KG", "PIECE"];

export function NewProductScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const plansQuery = useQuery({ queryKey: ["completed-harvest-plans"], queryFn: fetchCompletedHarvestPlans });

  const [selectedPlan, setSelectedPlan] = useState<HarvestPlanWithBatch | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<ProductUnit>("KG");
  const [price, setPrice] = useState("");
  const [availableQty, setAvailableQty] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createProduct({
        harvestPlanId: selectedPlan!.id,
        name: name.trim(),
        unit,
        price: Number(price),
        availableQty: Number(availableQty),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigation.goBack();
    },
  });

  const selectPlan = (plan: HarvestPlanWithBatch) => {
    setSelectedPlan(plan);
    setName(`${plan.batch.species} — ${plan.batch.code}`);
  };

  const canSubmit = selectedPlan && name.trim() && Number(price) > 0 && Number(availableQty) > 0;

  if (plansQuery.isPending) return <LoadingView />;
  if (plansQuery.isError) return <ErrorBanner message={apiErrorMessage(plansQuery.error)} onRetry={plansQuery.refetch} />;

  if (!selectedPlan) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Choose a completed harvest</Text>
        {plansQuery.data.length === 0 && (
          <EmptyState
            title="No completed harvests yet"
            subtitle="Mark a harvest plan as completed before listing it for sale."
          />
        )}
        {plansQuery.data.map((plan) => (
          <TouchableOpacity key={plan.id} onPress={() => selectPlan(plan)}>
            <Card>
              <Text style={styles.planTitle}>
                {plan.batch.species} — {plan.batch.code}
              </Text>
              <Text style={styles.meta}>
                Harvested {new Date(plan.plannedDate).toDateString()} · {plan.targetCount.toLocaleString()} fish @{" "}
                {plan.targetWeightG}g target
              </Text>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.sectionTitle}>From harvest</Text>
      <Card>
        <Text style={styles.planTitle}>
          {selectedPlan.batch.species} — {selectedPlan.batch.code}
        </Text>
        <TouchableOpacity onPress={() => setSelectedPlan(null)}>
          <Text style={styles.changeLink}>Change</Text>
        </TouchableOpacity>
      </Card>

      <FormField label="Product name" value={name} onChangeText={setName} placeholder="Rainbow Trout — B-001" />

      <Text style={styles.label}>Unit</Text>
      <View style={styles.unitRow}>
        {UNITS.map((u) => (
          <PrimaryButton
            key={u}
            title={u}
            variant={unit === u ? "primary" : "secondary"}
            onPress={() => setUnit(u)}
            style={styles.unitButton}
          />
        ))}
      </View>

      <FormField label="Price per unit" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="6.50" />
      <FormField
        label={`Available quantity (${unit === "KG" ? "kg" : "pieces"})`}
        value={availableQty}
        onChangeText={setAvailableQty}
        keyboardType="numeric"
        placeholder="120"
      />

      <PrimaryButton title="List for sale" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1c2424", marginBottom: 8 },
  planTitle: { fontSize: 15, fontWeight: "600", color: "#1c2424" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
  changeLink: { fontSize: 13, fontWeight: "700", color: "#0b6e6e", marginTop: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  unitRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  unitButton: { flex: 1 },
});
