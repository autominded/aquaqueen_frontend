import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createSamplingEntry } from "../../api/batches";
import { useEntrySubmit } from "./useEntrySubmit";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<BatchesStackParamList, "SamplingEntry">;

export function SamplingEntryScreen({ route }: Props) {
  const { batchId } = route.params;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [avgWeightG, setAvgWeightG] = useState("");
  const [sampleSize, setSampleSize] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useEntrySubmit(
    () =>
      createSamplingEntry(batchId, {
        date,
        avgWeightG: Number(avgWeightG),
        sampleSize: Number(sampleSize),
        notes: notes.trim() || undefined,
      }),
    batchId,
    "sampling"
  );

  const canSubmit = date && Number(avgWeightG) > 0 && Number(sampleSize) > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
      <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <FormField label="Average weight (g)" value={avgWeightG} onChangeText={setAvgWeightG} keyboardType="numeric" placeholder="45.2" />
      <FormField label="Sample size" value={sampleSize} onChangeText={setSampleSize} keyboardType="numeric" placeholder="30" />
      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />
      <PrimaryButton title="Save sampling entry" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
});
