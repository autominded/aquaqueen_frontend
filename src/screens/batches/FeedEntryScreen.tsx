import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createFeedEntry } from "../../api/batches";
import { useEntrySubmit } from "./useEntrySubmit";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<BatchesStackParamList, "FeedEntry">;

export function FeedEntryScreen({ route }: Props) {
  const { batchId } = route.params;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [feedType, setFeedType] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useEntrySubmit(
    () => createFeedEntry(batchId, { date, feedType: feedType.trim(), quantityKg: Number(quantityKg), notes: notes.trim() || undefined }),
    batchId,
    "feed"
  );

  const canSubmit = date && feedType && Number(quantityKg) > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
      <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <FormField label="Feed type" value={feedType} onChangeText={setFeedType} placeholder="Starter pellet" />
      <FormField label="Quantity (kg)" value={quantityKg} onChangeText={setQuantityKg} keyboardType="numeric" placeholder="12.5" />
      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />
      <PrimaryButton title="Save feed entry" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
});
