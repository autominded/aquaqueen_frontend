import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { fetchPurchases, recordPurchasePayment } from "../../api/purchases";
import { fetchAccounts } from "../../api/accounts";
import { LoadingView } from "../../components/LoadingView";
import { EmptyState } from "../../components/EmptyState";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<PurchasesStackParamList, "RecordPurchasePayment">;

export function RecordPurchasePaymentScreen({ route, navigation }: Props) {
  const { purchaseId } = route.params;
  const queryClient = useQueryClient();

  const purchasesQuery = useQuery({ queryKey: ["purchases"], queryFn: fetchPurchases });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });

  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");

  const openAccounts = (accountsQuery.data ?? []).filter((a) => !a.isClosed);
  const selectedAccountId = accountId ?? openAccounts[0]?.id;

  const mutation = useMutation({
    mutationFn: () => recordPurchasePayment(purchaseId, { accountId: selectedAccountId!, amount: Number(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      navigation.goBack();
    },
  });

  if (purchasesQuery.isPending || accountsQuery.isPending) return <LoadingView />;
  if (purchasesQuery.isError) return <ErrorBanner message={apiErrorMessage(purchasesQuery.error)} onRetry={purchasesQuery.refetch} />;
  if (accountsQuery.isError) return <ErrorBanner message={apiErrorMessage(accountsQuery.error)} onRetry={accountsQuery.refetch} />;

  const purchase = purchasesQuery.data.find((p) => p.id === purchaseId);
  if (!purchase) return <EmptyState title="Purchase not found" />;

  const paid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.round((purchase.totalCost - paid) * 100) / 100;
  const canSubmit = !!selectedAccountId && Number(amount) > 0 && Number(amount) <= remaining + 0.01;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.description}>{purchase.description}</Text>
      <Text style={styles.meta}>₹{paid.toFixed(2)} paid of ₹{purchase.totalCost.toFixed(2)} — ₹{remaining.toFixed(2)} remaining</Text>

      <Text style={styles.label}>Account</Text>
      <View style={styles.chipRow}>
        {openAccounts.map((a) => (
          <PrimaryButton
            key={a.id}
            title={a.name}
            variant={selectedAccountId === a.id ? "primary" : "secondary"}
            onPress={() => setAccountId(a.id)}
            style={styles.chip}
          />
        ))}
      </View>

      <FormField label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder={remaining.toFixed(2)} />

      <PrimaryButton title="Record payment" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  description: { fontSize: 16, fontWeight: "700", color: "#1c2424" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, minWidth: 90 },
});
