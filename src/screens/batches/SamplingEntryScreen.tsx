import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createSamplingEntry } from "../../api/batches";
import { useEntrySubmit } from "./useEntrySubmit";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { useUnits } from "../../context/UnitsContext";

type Props = NativeStackScreenProps<BatchesStackParamList, "SamplingEntry">;

export function SamplingEntryScreen({ route }: Props) {
  const { batchId, racewayId } = route.params;
  const { weightUnitLabel, fromDisplayWeight } = useUnits();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [avgWeight, setAvgWeight] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useEntrySubmit(
    () =>
      createSamplingEntry(batchId, {
        date,
        avgWeightG: fromDisplayWeight(Number(avgWeight)),
        sampleSize: Number(sampleSize),
        racewayId,
        notes: notes.trim() || undefined,
      }),
    batchId,
    "sampling",
    racewayId
  );

  const canSubmit = date && Number(avgWeight) > 0 && Number(sampleSize) > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
      <DateField label="Date" value={date} onChange={setDate} />
      <FormField label={`Average weight (${weightUnitLabel})`} value={avgWeight} onChangeText={setAvgWeight} keyboardType="numeric" placeholder="45.2" />
      <FormField label="Sample size" value={sampleSize} onChangeText={setSampleSize} keyboardType="numeric" placeholder="30" />
      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />
      <PrimaryButton title="Save sampling entry" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
});
