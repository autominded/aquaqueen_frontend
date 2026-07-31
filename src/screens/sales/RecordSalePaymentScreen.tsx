import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalesStackParamList } from "../../navigation/types";
import { fetchSales, recordSalePayment } from "../../api/pos";
import { fetchAccounts } from "../../api/accounts";
import { LoadingView } from "../../components/LoadingView";
import { EmptyState } from "../../components/EmptyState";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<SalesStackParamList, "RecordSalePayment">;

export function RecordSalePaymentScreen({ route, navigation }: Props) {
  const { saleId } = route.params;
  const queryClient = useQueryClient();

  const salesQuery = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });

  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");

  const openAccounts = (accountsQuery.data ?? []).filter((a) => !a.isClosed);
  const selectedAccountId = accountId ?? openAccounts[0]?.id;

  const mutation = useMutation({
    mutationFn: () => recordSalePayment(saleId, { accountId: selectedAccountId!, amount: Number(amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      navigation.goBack();
    },
  });

  if (salesQuery.isPending || accountsQuery.isPending) return <LoadingView />;
  if (salesQuery.isError) return <ErrorBanner message={apiErrorMessage(salesQuery.error)} onRetry={salesQuery.refetch} />;
  if (accountsQuery.isError) return <ErrorBanner message={apiErrorMessage(accountsQuery.error)} onRetry={accountsQuery.refetch} />;

  const sale = salesQuery.data.find((s) => s.id === saleId);
  if (!sale) return <EmptyState title="Sale not found" />;

  const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.round((sale.totalAmount - paid) * 100) / 100;
  const canSubmit = !!selectedAccountId && Number(amount) > 0 && Number(amount) <= remaining + 0.01;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.title}>{sale.contact?.name ?? "Sale"}</Text>
      <Text style={styles.meta}>₹{paid.toFixed(2)} paid of ₹{sale.totalAmount.toFixed(2)} — ₹{remaining.toFixed(2)} remaining</Text>

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
  title: { fontSize: 16, fontWeight: "700", color: "#1c2424" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, minWidth: 90 },
});
