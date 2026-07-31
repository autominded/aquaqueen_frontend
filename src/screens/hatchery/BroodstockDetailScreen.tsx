import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HatcheryStackParamList } from "../../navigation/types";
import { createPhotoperiodEntry, createStrippingPlan, fetchBroodstock, updateStrippingPlan } from "../../api/broodstock";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusPill } from "../../components/StatusPill";
import { apiErrorMessage } from "../../api/client";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<HatcheryStackParamList, "BroodstockDetail">;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function BroodstockDetailScreen({ route }: Props) {
  const { broodstockId } = route.params;
  const queryClient = useQueryClient();
  const detailQuery = useQuery({ queryKey: ["broodstock", broodstockId], queryFn: () => fetchBroodstock(broodstockId) });
  const { refreshing, onRefresh } = useRefreshing();

  const [lightHours, setLightHours] = useState("");
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().slice(0, 10));
  const [plannedDate, setPlannedDate] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["broodstock", broodstockId] });

  const photoperiodMutation = useMutation({
    mutationFn: () => createPhotoperiodEntry(broodstockId, { date: photoDate, lightHours: Number(lightHours) }),
    onSuccess: () => {
      setLightHours("");
      invalidate();
    },
  });

  const strippingPlanMutation = useMutation({
    mutationFn: () => createStrippingPlan(broodstockId, { plannedDate }),
    onSuccess: () => {
      setPlannedDate("");
      invalidate();
    },
  });

  const completePlanMutation = useMutation({
    mutationFn: (planId: string) => updateStrippingPlan(broodstockId, planId, { status: "COMPLETED" }),
    onSuccess: invalidate,
  });

  if (detailQuery.isPending) return <LoadingView />;
  if (detailQuery.isError) return <ErrorBanner message={apiErrorMessage(detailQuery.error)} onRetry={detailQuery.refetch} />;

  const { broodstock, photoperiodEntries, strippingPlans } = detailQuery.data;

  return (
    <RefreshableScrollView
      contentContainerStyle={styles.container}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>BROODSTOCK</Text>
        <Text style={styles.title}>{broodstock.raceway?.name ?? "Raceway"}</Text>
        <Text style={styles.dims}>{broodstock.species} · stocked {formatDate(broodstock.stockedDate)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{broodstock.count.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Broodstock</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Photoperiod</Text>
      <Card style={styles.formCard}>
        {photoperiodMutation.isError && <ErrorBanner message={apiErrorMessage(photoperiodMutation.error)} />}
        <View style={styles.row}>
          <DateField label="Date" value={photoDate} onChange={setPhotoDate} style={styles.rowField} />
          <FormField label="Light hours" value={lightHours} onChangeText={setLightHours} keyboardType="numeric" placeholder="14" style={styles.rowField} />
        </View>
        <PrimaryButton
          title="Log photoperiod"
          variant="secondary"
          onPress={() => photoperiodMutation.mutate()}
          loading={photoperiodMutation.isPending}
          disabled={!(Number(lightHours) > 0 && photoDate)}
        />
      </Card>
      {photoperiodEntries.map((entry) => (
        <View key={entry.id} style={styles.logRow}>
          <Text style={styles.logMeta}>{formatDate(entry.date)}</Text>
          <Text style={styles.logValue}>{entry.lightHours}h light</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Stripping plans</Text>
      <Card style={styles.formCard}>
        {strippingPlanMutation.isError && <ErrorBanner message={apiErrorMessage(strippingPlanMutation.error)} />}
        <DateField label="Planned date" value={plannedDate} onChange={setPlannedDate} />
        <PrimaryButton
          title="Plan stripping"
          variant="secondary"
          onPress={() => strippingPlanMutation.mutate()}
          loading={strippingPlanMutation.isPending}
          disabled={!plannedDate}
        />
      </Card>
      {strippingPlans.map((plan) => (
        <Card key={plan.id} style={styles.planCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.logValue}>{formatDate(plan.plannedDate)}</Text>
            <StatusPill label={plan.status} tone={plan.status === "COMPLETED" ? "success" : "neutral"} />
          </View>
          {plan.status === "PLANNED" && (
            <PrimaryButton
              title="Mark completed"
              variant="secondary"
              onPress={() => completePlanMutation.mutate(plan.id)}
              loading={completePlanMutation.isPending}
              style={styles.completeButton}
            />
          )}
        </Card>
      ))}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  hero: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20, marginBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: "800", color: "#BBD9D5", letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: "800", color: colors.white, marginTop: 4 },
  dims: { fontSize: 13, color: "#D5E8E5", marginTop: 6 },
  statsRow: { flexDirection: "row", marginTop: 14, borderTopWidth: 1, borderTopColor: "#2C5966", paddingTop: 12 },
  stat: { alignItems: "flex-start" },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.white },
  statLabel: { fontSize: 11, color: "#BBD9D5", marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ocean, marginTop: 16, marginBottom: 8 },
  formCard: { marginHorizontal: 0, marginBottom: 10 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  logRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  logMeta: { fontSize: 12, color: colors.inkMuted },
  logValue: { fontSize: 13, fontWeight: "700", color: colors.ink },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planCard: { marginHorizontal: 0, marginBottom: 8 },
  completeButton: { marginTop: 10 },
});
