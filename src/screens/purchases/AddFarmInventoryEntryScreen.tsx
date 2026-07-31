import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { createFarmInventoryEntry, uploadFarmInventoryBill } from "../../api/farmInventory";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { ReceiptDraft, ReceiptPicker } from "../../components/ReceiptPicker";
import { apiErrorMessage } from "../../api/client";
import { notify } from "../../lib/notify";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<PurchasesStackParamList, "AddFarmInventoryEntry">;

export function AddFarmInventoryEntryScreen({ route, navigation }: Props) {
  const { itemId, itemName } = route.params;
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [bill, setBill] = useState<ReceiptDraft | null>(null);

  const total = (Number(quantity) || 0) * (Number(purchasePrice) || 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const entry = await createFarmInventoryEntry(itemId, {
        quantity: Number(quantity),
        purchasePrice: Number(purchasePrice),
        date,
        notes: notes.trim() || undefined,
      });
      if (bill) {
        try {
          await uploadFarmInventoryBill(itemId, entry.id, bill);
        } catch {
          notify("Stock added", "The bill couldn't be uploaded.");
        }
      }
      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["farm-inventory-entries", itemId] });
      navigation.goBack();
    },
  });

  const canSubmit = Number(quantity) > 0 && Number(purchasePrice) > 0 && date;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.heading}>{itemName}</Text>

      <View style={styles.row}>
        <FormField label="Quantity (pcs)" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="10" style={styles.rowField} />
        <FormField label="Purchase price (per pc)" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="numeric" placeholder="450" style={styles.rowField} />
      </View>
      {total > 0 && (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
        </View>
      )}

      <DateField label="Date" value={date} onChange={setDate} />

      <Text style={styles.label}>Bill (optional)</Text>
      <ReceiptPicker
        draft={bill}
        onPick={setBill}
        onRemove={bill ? () => setBill(null) : undefined}
        promptLabel="Tap to attach the bill (photo or PDF)"
        uploadedLabel="Bill attached"
        fallbackName="bill"
      />

      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />

      <PrimaryButton title="Add stock" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  heading: { fontSize: 18, fontWeight: "800", color: colors.ocean, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  totalCard: { backgroundColor: colors.tealSoft, borderRadius: 12, padding: 14, marginTop: -6, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 13, fontWeight: "700", color: colors.tealDark },
  totalValue: { fontSize: 16, fontWeight: "800", color: colors.tealDark },
});
