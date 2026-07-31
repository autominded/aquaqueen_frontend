import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { fetchBatch, fetchSamplingEntries, updateBatch } from "../../api/batches";
import { fetchFarm } from "../../api/farm";
import { fetchSpecies } from "../../api/species";
import { BatchStage, BatchStatus } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { SelectField } from "../../components/SelectField";
import { RacewayAllocationEditor, RacewayAllocationLine } from "../../components/RacewayAllocationEditor";
import { apiErrorMessage } from "../../api/client";
import { useUnits } from "../../context/UnitsContext";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "EditBatch">;

const STAGES: { value: BatchStage; label: string }[] = [
  { value: "FINGERLING", label: "Fingerling" },
  { value: "JUVENILE", label: "Juvenile" },
  { value: "ADULT", label: "Adult" },
  { value: "BROODER", label: "Brooder" },
];
const STATUSES: { value: BatchStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "HARVESTED", label: "Harvested" },
  { value: "CLOSED", label: "Closed" },
];

export function EditBatchScreen({ route, navigation }: Props) {
  const { batchId } = route.params;
  const queryClient = useQueryClient();
  const { weightUnitLabel, fromDisplayWeight, toDisplayWeight, formatMass } = useUnits();
  const batchQuery = useQuery({ queryKey: ["batch", batchId], queryFn: () => fetchBatch(batchId) });
  const samplingQuery = useQuery({ queryKey: ["sampling", batchId], queryFn: () => fetchSamplingEntries(batchId) });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });
  const speciesQuery = useQuery({ queryKey: ["species"], queryFn: fetchSpecies });
  const batch = batchQuery.data;
  const raceways = farmQuery.data?.raceways ?? [];

  const [seeded, setSeeded] = useState(false);
  const [species, setSpecies] = useState("");
  const [stage, setStage] = useState<BatchStage>("FINGERLING");
  const [status, setStatus] = useState<BatchStatus>("ACTIVE");
  const [location, setLocation] = useState("");
  const [currentCount, setCurrentCount] = useState("");
  const [avgWeight, setAvgWeight] = useState("");
  const [racewayLines, setRacewayLines] = useState<RacewayAllocationLine[]>([]);

  const hasStockings = (batch?.stockings.length ?? 0) > 0;
  const originalAvgWeightG = samplingQuery.data?.[0]?.avgWeightG;

  useEffect(() => {
    if (seeded || !batch || samplingQuery.isPending) return;
    setSpecies(batch.species);
    setStage(batch.stage);
    setStatus(batch.status);
    setLocation(batch.location);
    setCurrentCount(String(batch.currentCount));
    setAvgWeight(originalAvgWeightG ? String(toDisplayWeight(originalAvgWeightG)) : "");
    setRacewayLines(batch.stockings.map((s) => ({ racewayId: s.racewayId, count: String(s.currentCount) })));
    setSeeded(true);
  }, [seeded, batch, samplingQuery.isPending]);

  const validRacewayLines = racewayLines.filter((l) => l.racewayId && Number(l.count) > 0);
  const allocatedCount = validRacewayLines.reduce((sum, l) => sum + Number(l.count), 0);

  const mutation = useMutation({
    mutationFn: () => {
      const avgWeightGDisplay = Number(avgWeight);
      const avgWeightG = fromDisplayWeight(avgWeightGDisplay);
      const changedAvgWeight = avgWeightGDisplay > 0 && avgWeightG !== originalAvgWeightG;
      return updateBatch(batchId, {
        species: species.trim(),
        stage,
        status,
        ...(hasStockings
          ? { stockings: validRacewayLines.map((l) => ({ racewayId: l.racewayId, count: Number(l.count) })) }
          : { location: location.trim(), currentCount: Number(currentCount) }),
        ...(changedAvgWeight ? { avgWeightG } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["sampling", batchId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      queryClient.invalidateQueries({ queryKey: ["raceway-operations"] });
      navigation.goBack();
    },
  });

  const canSubmit = Boolean(
    species.trim() &&
      Number(avgWeight) > 0 &&
      Number(currentCount) >= 0 &&
      (hasStockings
        ? validRacewayLines.length === racewayLines.length && racewayLines.length > 0 && allocatedCount === Number(currentCount)
        : location.trim())
  );

  if (batchQuery.isPending) return <LoadingView />;
  if (batchQuery.isError) return <ErrorBanner message={apiErrorMessage(batchQuery.error)} onRetry={batchQuery.refetch} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <SelectField
        label="Species"
        value={species || null}
        onSelect={setSpecies}
        placeholder={speciesQuery.data?.length ? "Select a species" : "No species set up yet"}
        options={(speciesQuery.data ?? []).map((s) => ({ value: s.name, label: s.name }))}
      />

      <SelectField label="Stage" value={stage} onSelect={(v) => setStage(v as BatchStage)} options={STAGES} />

      <SelectField label="Status" value={status} onSelect={(v) => setStatus(v as BatchStatus)} options={STATUSES} />

      <View style={styles.row}>
        <FormField
          label="Fish count"
          value={currentCount}
          onChangeText={setCurrentCount}
          keyboardType="numeric"
          placeholder="5000"
          style={styles.rowField}
        />
        <FormField
          label={`Avg weight per fish (${weightUnitLabel})`}
          value={avgWeight}
          onChangeText={setAvgWeight}
          placeholder="0.2"
          keyboardType="numeric"
          style={styles.rowField}
        />
      </View>
      {Number(currentCount) > 0 && Number(avgWeight) > 0 && (
        <View style={styles.biomassCard}>
          <Text style={styles.biomassLabel}>Total biomass</Text>
          <Text style={styles.biomassValue}>{formatMass((Number(currentCount) * fromDisplayWeight(Number(avgWeight))) / 1000)}</Text>
        </View>
      )}

      <Text style={styles.label}>Location</Text>
      {hasStockings ? (
        <RacewayAllocationEditor raceways={raceways} lines={racewayLines} onChange={setRacewayLines} targetCount={Number(currentCount) || 0} />
      ) : (
        <FormField label="Location" value={location} onChangeText={setLocation} placeholder="Pond 3" />
      )}
      {hasStockings && (
        <Text style={styles.hint}>
          Mortality logged against a specific raceway keeps its own count in sync automatically — adjust the numbers here only to
          correct a mistake.
        </Text>
      )}

      <PrimaryButton title="Save changes" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} style={styles.saveButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  hint: { fontSize: 12, color: colors.inkMuted, marginTop: -8, marginBottom: 16, lineHeight: 17 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  biomassCard: { backgroundColor: colors.tealSoft, borderRadius: radii.sm, padding: 14, marginTop: -6, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  biomassLabel: { fontSize: 13, fontWeight: "700", color: colors.tealDark },
  biomassValue: { fontSize: 16, fontWeight: "800", color: colors.tealDark },
  saveButton: { marginTop: 8 },
});
