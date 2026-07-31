import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { BatchesStackParamList, AppTabParamList } from "../../navigation/types";
import { createBatch } from "../../api/batches";
import { fetchFarm } from "../../api/farm";
import { fetchSpecies } from "../../api/species";
import { BatchStage } from "../../api/types";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { LoadingView } from "../../components/LoadingView";
import { AppIcon } from "../../components/AppIcon";
import { SelectField } from "../../components/SelectField";
import { RacewayAllocationEditor, RacewayAllocationLine } from "../../components/RacewayAllocationEditor";
import { apiErrorMessage } from "../../api/client";
import { useUnits } from "../../context/UnitsContext";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "NewBatch">;

const STAGES: { value: BatchStage; label: string }[] = [
  { value: "FINGERLING", label: "Fingerling" },
  { value: "JUVENILE", label: "Juvenile" },
  { value: "ADULT", label: "Adult" },
  { value: "BROODER", label: "Brooder" },
];

export function NewBatchScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { weightUnitLabel, fromDisplayWeight, formatMass } = useUnits();
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });
  const speciesQuery = useQuery({ queryKey: ["species"], queryFn: fetchSpecies });
  const raceways = farmQuery.data?.raceways ?? [];
  const hasRaceways = raceways.length > 0;

  const [code, setCode] = useState("");
  const [species, setSpecies] = useState("");
  const [stage, setStage] = useState<BatchStage>("FINGERLING");
  const [location, setLocation] = useState("");
  const [racewayLines, setRacewayLines] = useState<RacewayAllocationLine[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [initialCount, setInitialCount] = useState("");
  const [initialAvgWeight, setInitialAvgWeight] = useState("");

  // Default to one line against the first raceway once the farm data loads,
  // if nothing's been picked yet — same convention as FeedItemsEditor's
  // usage in NewPurchaseScreen.
  useEffect(() => {
    if (hasRaceways && racewayLines.length === 0) {
      setRacewayLines([{ racewayId: raceways[0].id, count: "" }]);
    }
  }, [hasRaceways, raceways.length]);

  const validRacewayLines = racewayLines.filter((l) => l.racewayId && Number(l.count) > 0);
  const allocatedCount = validRacewayLines.reduce((sum, l) => sum + Number(l.count), 0);

  const mutation = useMutation({
    mutationFn: () =>
      createBatch({
        code: code.trim(),
        species: species.trim(),
        stage,
        startDate,
        initialCount: Number(initialCount),
        initialAvgWeightG: fromDisplayWeight(Number(initialAvgWeight)),
        ...(hasRaceways
          ? { stockings: validRacewayLines.map((l) => ({ racewayId: l.racewayId, count: Number(l.count) })) }
          : { location: location.trim() }),
      }),
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      navigation.replace("BatchDetails", { batchId: batch.id });
    },
  });

  const canSubmit = Boolean(
    code &&
      species &&
      startDate &&
      Number(initialCount) > 0 &&
      Number(initialAvgWeight) > 0 &&
      (hasRaceways
        ? validRacewayLines.length === racewayLines.length && racewayLines.length > 0 && allocatedCount === Number(initialCount)
        : location)
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <FormField label="Batch code" value={code} onChangeText={setCode} placeholder="B-002" autoCapitalize="characters" />

      <SelectField
        label="Species"
        value={species || null}
        onSelect={setSpecies}
        placeholder={speciesQuery.data?.length ? "Select a species" : "No species set up yet"}
        options={(speciesQuery.data ?? []).map((s) => ({ value: s.name, label: s.name }))}
      />

      <SelectField
        label="Stage"
        value={stage}
        onSelect={(v) => setStage(v as BatchStage)}
        options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
      />

      <View style={styles.row}>
        <FormField
          label="Initial fish count"
          value={initialCount}
          onChangeText={setInitialCount}
          placeholder="5000"
          keyboardType="numeric"
          style={styles.rowField}
        />
        <FormField
          label={`Avg weight per fish (${weightUnitLabel})`}
          value={initialAvgWeight}
          onChangeText={setInitialAvgWeight}
          placeholder="0.2"
          keyboardType="numeric"
          style={styles.rowField}
        />
      </View>
      {Number(initialCount) > 0 && Number(initialAvgWeight) > 0 && (
        <View style={styles.biomassCard}>
          <Text style={styles.biomassLabel}>Total biomass</Text>
          <Text style={styles.biomassValue}>
            {formatMass((Number(initialCount) * fromDisplayWeight(Number(initialAvgWeight))) / 1000)}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Location</Text>
      {farmQuery.isPending && <LoadingView />}
      {farmQuery.isSuccess && !hasRaceways && (
        <>
          <View style={styles.noRaceways}>
            <Text style={styles.noRacewaysText}>No raceways set up yet — add them in Farm setup to split fish across raceways.</Text>
            <TouchableOpacity style={styles.noRacewaysButton} onPress={() => tabNavigation.navigate("Profile", { screen: "FarmSetup" })}>
              <Text style={styles.noRacewaysButtonText}>Go to Farm setup</Text>
              <AppIcon name="chevron-right" size={16} color={colors.tealDark} />
            </TouchableOpacity>
          </View>
          <FormField label="Location" value={location} onChangeText={setLocation} placeholder="Pond 3" />
        </>
      )}
      {hasRaceways && (
        <RacewayAllocationEditor
          raceways={raceways}
          lines={racewayLines}
          onChange={setRacewayLines}
          targetCount={Number(initialCount) || 0}
        />
      )}

      <DateField label="Start date" value={startDate} onChange={setStartDate} />

      <PrimaryButton title="Create batch" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  biomassCard: { backgroundColor: colors.tealSoft, borderRadius: radii.sm, padding: 14, marginTop: -6, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  biomassLabel: { fontSize: 13, fontWeight: "700", color: colors.tealDark },
  biomassValue: { fontSize: 16, fontWeight: "800", color: colors.tealDark },
  noRaceways: { backgroundColor: colors.tealSoft, borderRadius: radii.sm, padding: 14, marginBottom: 16 },
  noRacewaysText: { fontSize: 13, color: colors.tealDark, lineHeight: 18 },
  noRacewaysButton: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  noRacewaysButtonText: { fontSize: 13, fontWeight: "800", color: colors.tealDark, marginRight: 2 },
});
