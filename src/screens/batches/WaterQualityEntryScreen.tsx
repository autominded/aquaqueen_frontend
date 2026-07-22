import React, { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createWaterQualityReading } from "../../api/batches";
import { useEntrySubmit } from "./useEntrySubmit";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<BatchesStackParamList, "WaterQualityEntry">;

export function WaterQualityEntryScreen({ route }: Props) {
  const { batchId } = route.params;
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [temperatureC, setTemperatureC] = useState("");
  const [dissolvedOxygen, setDissolvedOxygen] = useState("");
  const [ph, setPh] = useState("");
  const [ammonia, setAmmonia] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useEntrySubmit(
    () =>
      createWaterQualityReading(batchId, {
        date,
        temperatureC: Number(temperatureC),
        dissolvedOxygen: Number(dissolvedOxygen),
        ph: Number(ph),
        ammonia: Number(ammonia),
        notes: notes.trim() || undefined,
      }),
    batchId,
    "water-quality"
  );

  const canSubmit = date && temperatureC && dissolvedOxygen && ph && ammonia;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
      <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <FormField label="Temperature (°C)" value={temperatureC} onChangeText={setTemperatureC} keyboardType="numeric" placeholder="14.2" />
      <FormField label="Dissolved oxygen (mg/L)" value={dissolvedOxygen} onChangeText={setDissolvedOxygen} keyboardType="numeric" placeholder="8.1" />
      <FormField label="pH" value={ph} onChangeText={setPh} keyboardType="numeric" placeholder="7.4" />
      <FormField label="Ammonia (mg/L)" value={ammonia} onChangeText={setAmmonia} keyboardType="numeric" placeholder="0.02" />
      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />
      <PrimaryButton title="Save reading" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
});
