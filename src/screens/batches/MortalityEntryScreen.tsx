import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createMortalityEntry } from "../../api/batches";
import { useEntrySubmit } from "./useEntrySubmit";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<BatchesStackParamList, "MortalityEntry">;

export function MortalityEntryScreen({ route }: Props) {
  const { batchId } = route.params;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("");
  const [cause, setCause] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useEntrySubmit(
    () =>
      createMortalityEntry(batchId, {
        date,
        count: Number(count),
        cause: cause.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    batchId,
    "mortality"
  );

  const canSubmit = date && Number(count) > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
      <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <FormField label="Number of fish lost" value={count} onChangeText={setCount} keyboardType="numeric" placeholder="10" />
      <FormField label="Cause (optional)" value={cause} onChangeText={setCause} placeholder="Disease, handling, unknown…" />
      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />
      <PrimaryButton title="Save mortality entry" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
});
