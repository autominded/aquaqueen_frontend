import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createMortalityEntry, fetchSamplingEntries, uploadMortalityPhoto } from "../../api/batches";
import { fetchMortalityCauses } from "../../api/mortalityCauses";
import { useEntrySubmit } from "./useEntrySubmit";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { SelectField } from "../../components/SelectField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { ReceiptDraft, ReceiptPicker } from "../../components/ReceiptPicker";
import { apiErrorMessage } from "../../api/client";
import { notify } from "../../lib/notify";
import { useUnits } from "../../context/UnitsContext";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "MortalityEntry">;

export function MortalityEntryScreen({ route }: Props) {
  const { batchId, racewayId } = route.params;
  const { massUnitLabel, fromDisplayMass } = useUnits();
  const samplingQuery = useQuery({ queryKey: ["sampling", batchId], queryFn: () => fetchSamplingEntries(batchId) });
  const causesQuery = useQuery({ queryKey: ["mortality-causes"], queryFn: fetchMortalityCauses });

  // Same raceway-scoped-with-batch-wide-fallback lookup raceways.ts uses for
  // per-stocking growth — the latest sampling entry, preferring one logged
  // against this raceway but falling back to a batch-wide entry.
  const latestAvgWeightG = useMemo(() => {
    const entries = (samplingQuery.data ?? []).filter((e) => !racewayId || !e.racewayId || e.racewayId === racewayId);
    return entries[0]?.avgWeightG;
  }, [samplingQuery.data, racewayId]);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightLost, setWeightLost] = useState("");
  const [manualCount, setManualCount] = useState(false);
  const [count, setCount] = useState("");
  const [cause, setCause] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<ReceiptDraft | null>(null);

  const estimatedCount =
    latestAvgWeightG && Number(weightLost) > 0
      ? Math.round((fromDisplayMass(Number(weightLost)) * 1000) / latestAvgWeightG)
      : undefined;
  const useWeightInput = Boolean(latestAvgWeightG) && !manualCount;
  const resolvedCount = useWeightInput ? estimatedCount : Number(count);

  const mutation = useEntrySubmit(
    async () => {
      const entry = await createMortalityEntry(batchId, {
        date,
        count: resolvedCount!,
        cause: cause.trim() || undefined,
        racewayId,
        notes: notes.trim() || undefined,
      });
      if (photo) {
        try {
          await uploadMortalityPhoto(batchId, entry.id, photo);
        } catch {
          // The entry itself is already saved — surface the photo failure
          // separately rather than implying the whole save failed, same
          // graceful-degradation approach as the purchase receipt upload.
          notify("Mortality entry saved", "The photo couldn't be uploaded.");
        }
      }
      return entry;
    },
    batchId,
    "mortality",
    racewayId
  );

  const canSubmit = Boolean(date && resolvedCount && resolvedCount > 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
      <DateField label="Date" value={date} onChange={setDate} />

      {useWeightInput ? (
        <>
          <FormField
            label={`Weight lost (${massUnitLabel})`}
            value={weightLost}
            onChangeText={setWeightLost}
            keyboardType="numeric"
            placeholder="1.5"
          />
          <Text style={styles.hint}>
            {estimatedCount !== undefined
              ? `≈ ${estimatedCount.toLocaleString()} fish, based on the latest sampled average of ${Math.round(latestAvgWeightG!).toLocaleString()}g.`
              : `Based on the latest sampled average of ${Math.round(latestAvgWeightG!).toLocaleString()}g per fish.`}
          </Text>
          <TouchableOpacity onPress={() => setManualCount(true)}>
            <Text style={styles.link}>Enter fish count manually instead</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <FormField label="Number of fish lost" value={count} onChangeText={setCount} keyboardType="numeric" placeholder="10" />
          {Boolean(latestAvgWeightG) && (
            <TouchableOpacity onPress={() => setManualCount(false)}>
              <Text style={styles.link}>Estimate from weight instead</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <SelectField
        label="Cause (optional)"
        value={cause || null}
        onSelect={setCause}
        placeholder={causesQuery.data?.length ? "Select a cause" : "No causes set up yet"}
        options={(causesQuery.data ?? []).map((c) => ({ value: c.name, label: c.name }))}
      />

      <Text style={styles.label}>Photo (optional)</Text>
      <Text style={styles.hint}>Helps with future disease pattern review — doesn't affect the count recorded.</Text>
      <ReceiptPicker
        draft={photo}
        onPick={setPhoto}
        onRemove={photo ? () => setPhoto(null) : undefined}
        fileTypes={["image/*"]}
        fallbackName="mortality-photo"
        promptLabel="Tap to attach a photo of the fish"
        uploadedLabel="Photo attached"
      />

      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />
      <PrimaryButton title="Save mortality entry" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: 8, lineHeight: 16 },
  link: { fontSize: 13, fontWeight: "700", color: colors.teal, marginBottom: 16 },
});
