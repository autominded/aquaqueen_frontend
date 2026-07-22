import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { depositFunds, fetchAccounts } from "../../api/accounts";
import { LoadingView } from "../../components/LoadingView";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<PurchasesStackParamList, "DepositFunds">;

export function DepositFundsScreen({ route, navigation }: Props) {
  const queryClient = useQueryClient();
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });

  const [accountId, setAccountId] = useState<string | undefined>(route.params?.accountId);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const openAccounts = (accountsQuery.data ?? []).filter((a) => !a.isClosed);
  const selectedAccountId = accountId ?? openAccounts[0]?.id;

  const mutation = useMutation({
    mutationFn: () => depositFunds({ accountId: selectedAccountId!, amount: Number(amount), note: note.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      navigation.goBack();
    },
  });

  const canSubmit = !!selectedAccountId && Number(amount) > 0;

  if (accountsQuery.isPending) return <LoadingView />;
  if (accountsQuery.isError) return <ErrorBanner message={apiErrorMessage(accountsQuery.error)} onRetry={accountsQuery.refetch} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.label}>Deposit into</Text>
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

      <FormField label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="50.00" />
      <FormField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Cash sale at farmers market" />

      <PrimaryButton title="Record deposit" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, minWidth: 90 },
});
