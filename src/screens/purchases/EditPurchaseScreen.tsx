import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { fetchPurchases, updatePurchase } from "../../api/purchases";
import { fetchContacts } from "../../api/contacts";
import { PurchaseCategory } from "../../api/types";
import { PURCHASE_CATEGORIES, CATEGORY_LABEL } from "./categories";
import { LoadingView } from "../../components/LoadingView";
import { EmptyState } from "../../components/EmptyState";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<PurchasesStackParamList, "EditPurchase">;

export function EditPurchaseScreen({ route, navigation }: Props) {
  const { purchaseId } = route.params;
  const queryClient = useQueryClient();

  const purchasesQuery = useQuery({ queryKey: ["purchases"], queryFn: fetchPurchases });
  const contactsQuery = useQuery({ queryKey: ["contacts", "SUPPLIER"], queryFn: () => fetchContacts("SUPPLIER") });

  const purchase = purchasesQuery.data?.find((p) => p.id === purchaseId);

  const [seeded, setSeeded] = useState(false);
  const [category, setCategory] = useState<PurchaseCategory>("FEED");
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (seeded || !purchase) return;
    setCategory(purchase.category);
    setContactId(purchase.contactId ?? undefined);
    setDescription(purchase.description);
    setQuantity(String(purchase.quantity));
    setUnit(purchase.unit);
    setUnitCost(String(purchase.unitCost));
    setPurchaseDate(purchase.purchaseDate.slice(0, 10));
    setNotes(purchase.notes ?? "");
    setSeeded(true);
  }, [seeded, purchase]);

  const estimatedTotal = Number(quantity) > 0 && Number(unitCost) > 0 ? Number(quantity) * Number(unitCost) : 0;
  const paidSoFar = purchase?.payments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const isFullyPaid = paidSoFar >= estimatedTotal - 0.01;

  const mutation = useMutation({
    mutationFn: () =>
      updatePurchase(purchaseId, {
        contactId,
        category,
        description: description.trim(),
        quantity: Number(quantity),
        unit: unit.trim(),
        unitCost: Number(unitCost),
        purchaseDate,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      navigation.goBack();
    },
  });

  const canSubmit =
    description.trim() &&
    unit.trim() &&
    purchaseDate &&
    Number(quantity) > 0 &&
    Number(unitCost) > 0 &&
    (isFullyPaid || !!contactId);

  if (purchasesQuery.isPending) return <LoadingView />;
  if (purchasesQuery.isError) return <ErrorBanner message={apiErrorMessage(purchasesQuery.error)} onRetry={purchasesQuery.refetch} />;
  if (!purchase) return <EmptyState title="Purchase not found" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {PURCHASE_CATEGORIES.map((c) => (
          <PrimaryButton
            key={c}
            title={CATEGORY_LABEL[c]}
            variant={category === c ? "primary" : "secondary"}
            onPress={() => setCategory(c)}
            style={styles.chip}
          />
        ))}
      </View>

      <FormField label="Description" value={description} onChangeText={setDescription} placeholder="Trout Grower Pellets, 8mm" />

      <View style={styles.row}>
        <FormField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="20" style={styles.rowField} />
        <FormField label="Unit" value={unit} onChangeText={setUnit} placeholder="bags" style={styles.rowField} />
      </View>

      <FormField label="Unit cost" value={unitCost} onChangeText={setUnitCost} keyboardType="numeric" placeholder="42.50" />
      {estimatedTotal > 0 && <Text style={styles.totalPreview}>Total: ${estimatedTotal.toFixed(2)}</Text>}
      <Text style={styles.meta}>Already paid ${paidSoFar.toFixed(2)} — payments are adjusted separately.</Text>

      <FormField label="Purchase date (YYYY-MM-DD)" value={purchaseDate} onChangeText={setPurchaseDate} />

      {!isFullyPaid && (
        <Text style={styles.dueNote}>The remaining balance will be owed to the supplier — a supplier is required.</Text>
      )}
      <Text style={styles.label}>Supplier{isFullyPaid ? " (optional)" : ""}</Text>
      <View style={styles.chipRow}>
        {isFullyPaid && (
          <PrimaryButton
            title="None"
            variant={contactId === undefined ? "primary" : "secondary"}
            onPress={() => setContactId(undefined)}
            style={styles.chip}
          />
        )}
        {contactsQuery.data?.map((c) => (
          <PrimaryButton
            key={c.id}
            title={c.name}
            variant={contactId === c.id ? "primary" : "secondary"}
            onPress={() => setContactId(c.id)}
            style={styles.chip}
          />
        ))}
      </View>

      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />

      <PrimaryButton title="Save changes" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, minWidth: 90 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  totalPreview: { fontSize: 13, fontWeight: "700", color: "#0b6e6e", marginTop: -8, marginBottom: 4 },
  meta: { fontSize: 12, color: "#7a8787", marginBottom: 16 },
  dueNote: { fontSize: 12, color: "#b9770e", marginBottom: 12 },
});
