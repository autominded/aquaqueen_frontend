import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { createPurchase } from "../../api/purchases";
import { fetchContacts } from "../../api/contacts";
import { fetchAccounts } from "../../api/accounts";
import { PurchaseCategory } from "../../api/types";
import { PURCHASE_CATEGORIES, CATEGORY_LABEL } from "./categories";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { PaymentLine, PaymentSplitEditor } from "../../components/PaymentSplitEditor";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<PurchasesStackParamList, "NewPurchase">;

export function NewPurchaseScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const contactsQuery = useQuery({ queryKey: ["contacts", "SUPPLIER"], queryFn: () => fetchContacts("SUPPLIER") });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });

  const [category, setCategory] = useState<PurchaseCategory>("FEED");
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const accounts = accountsQuery.data ?? [];
  const estimatedTotal = Number(quantity) > 0 && Number(unitCost) > 0 ? Number(quantity) * Number(unitCost) : 0;

  // Keep a single default payment row tracking the live total; once split
  // into more than one row, the user's manual amounts take over.
  useEffect(() => {
    if (payments.length <= 1 && accounts[0]) {
      setPayments([{ accountId: payments[0]?.accountId ?? accounts[0].id, amount: estimatedTotal > 0 ? String(estimatedTotal) : "" }]);
    }
  }, [estimatedTotal, accounts.length]);

  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paymentsWithinTotal = estimatedTotal > 0 && paymentsTotal <= estimatedTotal + 0.01;
  const isFullyPaid = paymentsWithinTotal && Math.abs(paymentsTotal - estimatedTotal) < 0.01;
  const remaining = Math.max(0, Math.round((estimatedTotal - paymentsTotal) * 100) / 100);

  const mutation = useMutation({
    mutationFn: () =>
      createPurchase({
        contactId,
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({ accountId: p.accountId, amount: Number(p.amount) })),
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
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      navigation.goBack();
    },
  });

  const canSubmit =
    description.trim() &&
    unit.trim() &&
    purchaseDate &&
    Number(quantity) > 0 &&
    Number(unitCost) > 0 &&
    paymentsWithinTotal &&
    (isFullyPaid || !!contactId);

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

      <FormField label="Purchase date (YYYY-MM-DD)" value={purchaseDate} onChangeText={setPurchaseDate} />

      <Text style={styles.label}>Paid from</Text>
      <PaymentSplitEditor accounts={accounts} total={estimatedTotal} payments={payments} onChange={setPayments} />
      {!isFullyPaid && remaining > 0 && (
        <Text style={styles.dueNote}>${remaining.toFixed(2)} will be recorded as owed to the supplier — a supplier is required.</Text>
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
      <TouchableOpacity onPress={() => navigation.navigate("NewContact")}>
        <Text style={styles.addSupplierLink}>+ Add a new supplier</Text>
      </TouchableOpacity>

      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />

      <PrimaryButton title="Log purchase" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
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
  totalPreview: { fontSize: 13, fontWeight: "700", color: "#0b6e6e", marginTop: -8, marginBottom: 16 },
  dueNote: { fontSize: 12, color: "#b9770e", marginBottom: 12 },
  addSupplierLink: { fontSize: 13, fontWeight: "700", color: "#0b6e6e", marginBottom: 16 },
});
