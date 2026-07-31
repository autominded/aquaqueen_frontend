import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createFeedEntry } from "../../api/batches";
import { fetchFeedInventory, fetchPelletSizes } from "../../api/feedCatalog";
import { useEntrySubmit } from "./useEntrySubmit";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { useUnits } from "../../context/UnitsContext";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "FeedEntry">;

// Below this, flag stock as running low — roughly "less than a bag" for a
// typical 25kg bag, not tied to any real reorder threshold the farm sets.
const LOW_STOCK_KG = 25;

export function FeedEntryScreen({ route }: Props) {
  const { batchId, racewayId } = route.params;
  const { massUnitLabel, formatMass, fromDisplayMass } = useUnits();
  const pelletSizesQuery = useQuery({ queryKey: ["pellet-sizes"], queryFn: fetchPelletSizes });
  const inventoryQuery = useQuery({ queryKey: ["feed-inventory"], queryFn: fetchFeedInventory });
  const pelletSizes = pelletSizesQuery.data ?? [];

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [pelletSizeId, setPelletSizeId] = useState<string | undefined>(undefined);
  const [feedManufacturerId, setFeedManufacturerId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");

  const stock = inventoryQuery.data?.find((i) => i.pelletSizeId === pelletSizeId);
  const manufacturerOptions = stock?.byManufacturer ?? [];
  // Only ask which manufacturer when there's an actual choice to make — a
  // single-manufacturer (or manufacturer-less) pellet size doesn't need one.
  const needsManufacturerChoice = manufacturerOptions.length > 1;
  const quantityKg = fromDisplayMass(Number(quantity) || 0);
  const lowStock = stock !== undefined && stock.stockKg > 0 && stock.stockKg <= LOW_STOCK_KG;
  const exceedsStock = stock !== undefined && quantityKg > stock.stockKg;

  const mutation = useEntrySubmit(
    () =>
      createFeedEntry(batchId, {
        date,
        pelletSizeId: pelletSizeId!,
        feedManufacturerId: needsManufacturerChoice ? feedManufacturerId : manufacturerOptions[0]?.feedManufacturerId,
        quantityKg,
        racewayId,
        notes: notes.trim() || undefined,
      }),
    batchId,
    "feed",
    racewayId
  );

  const canSubmit = Boolean(date && pelletSizeId && Number(quantity) > 0 && (!needsManufacturerChoice || feedManufacturerId));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
      <DateField label="Date" value={date} onChange={setDate} />

      <Text style={styles.label}>Pellet size</Text>
      {pelletSizesQuery.isSuccess && pelletSizes.length === 0 && (
        <Text style={styles.hint}>No pellet sizes configured yet — add them from the super admin Feed catalog screen.</Text>
      )}
      <View style={styles.chipRow}>
        {pelletSizes.map((p) => (
          <PrimaryButton
            key={p.id}
            title={p.label}
            variant={pelletSizeId === p.id ? "primary" : "secondary"}
            onPress={() => {
              setPelletSizeId(p.id);
              setFeedManufacturerId(undefined);
            }}
            style={styles.chip}
          />
        ))}
      </View>
      {stock && !needsManufacturerChoice && <Text style={styles.stockHint}>In stock: {formatMass(Math.max(0, stock.stockKg))}</Text>}
      {stock && lowStock && !needsManufacturerChoice && (
        <Text style={styles.warning}>Running low — only {formatMass(stock.stockKg)} left for this pellet size.</Text>
      )}

      {needsManufacturerChoice && (
        <SelectField
          label="Manufacturer"
          value={feedManufacturerId ?? null}
          onSelect={setFeedManufacturerId}
          placeholder="Select which manufacturer's feed"
          options={manufacturerOptions.map((m) => ({
            value: m.feedManufacturerId,
            label: m.name,
            subtitle: `${formatMass(Math.max(0, m.stockKg))} in stock${m.stockKg > 0 && m.stockKg <= LOW_STOCK_KG ? " — running low" : ""}`,
          }))}
        />
      )}

      <FormField label={`Quantity (${massUnitLabel})`} value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="12.5" />
      {exceedsStock && (
        <Text style={styles.warning}>
          This is more than the {formatMass(stock!.stockKg)} left in stock for this pellet size — it'll still save, but stock will go negative.
        </Text>
      )}

      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />
      <PrimaryButton title="Save feed entry" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, minWidth: 70 },
  stockHint: { fontSize: 12, color: colors.inkMuted, marginBottom: 16 },
  warning: { fontSize: 12, color: colors.amber, marginTop: -8, marginBottom: 16, lineHeight: 17 },
});
