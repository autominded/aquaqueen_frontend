import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createBatch } from "../../api/batches";
import { BatchStage } from "../../api/types";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<BatchesStackParamList, "NewBatch">;

const STAGES: BatchStage[] = ["FRY", "FINGERLING", "JUVENILE", "ADULT"];

export function NewBatchScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [species, setSpecies] = useState("");
  const [stage, setStage] = useState<BatchStage>("FRY");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [initialCount, setInitialCount] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createBatch({
        code: code.trim(),
        species: species.trim(),
        stage,
        location: location.trim(),
        startDate,
        initialCount: Number(initialCount),
      }),
    onSuccess: (batch) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      navigation.replace("BatchDetails", { batchId: batch.id });
    },
  });

  const canSubmit = code && species && location && startDate && Number(initialCount) > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <FormField label="Batch code" value={code} onChangeText={setCode} placeholder="B-002" autoCapitalize="characters" />
      <FormField label="Species" value={species} onChangeText={setSpecies} placeholder="Rainbow Trout" />

      <Text style={styles.label}>Stage</Text>
      <View style={styles.stageRow}>
        {STAGES.map((s) => (
          <PrimaryButton
            key={s}
            title={s}
            variant={stage === s ? "primary" : "secondary"}
            onPress={() => setStage(s)}
            style={styles.stageButton}
          />
        ))}
      </View>

      <FormField label="Location" value={location} onChangeText={setLocation} placeholder="Pond 3" />
      <FormField label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-07-18" />
      <FormField
        label="Initial fish count"
        value={initialCount}
        onChangeText={setInitialCount}
        placeholder="5000"
        keyboardType="numeric"
      />

      <PrimaryButton title="Create batch" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  stageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  stageButton: { paddingHorizontal: 12, minWidth: 90 },
});
