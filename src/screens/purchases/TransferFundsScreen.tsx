import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { fetchAccounts, transferFunds } from "../../api/accounts";
import { LoadingView } from "../../components/LoadingView";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<PurchasesStackParamList, "TransferFunds">;

export function TransferFundsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });

  const [fromAccountId, setFromAccountId] = useState<string | undefined>(undefined);
  const [toAccountId, setToAccountId] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const openAccounts = (accountsQuery.data ?? []).filter((a) => !a.isClosed);

  const mutation = useMutation({
    mutationFn: () =>
      transferFunds({
        fromAccountId: fromAccountId!,
        toAccountId: toAccountId!,
        amount: Number(amount),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      navigation.goBack();
    },
  });

  const canSubmit = !!fromAccountId && !!toAccountId && fromAccountId !== toAccountId && Number(amount) > 0;

  if (accountsQuery.isPending) return <LoadingView />;
  if (accountsQuery.isError) return <ErrorBanner message={apiErrorMessage(accountsQuery.error)} onRetry={accountsQuery.refetch} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.label}>From</Text>
      <View style={styles.chipRow}>
        {openAccounts.map((a) => (
          <PrimaryButton
            key={a.id}
            title={a.name}
            variant={fromAccountId === a.id ? "primary" : "secondary"}
            onPress={() => setFromAccountId(a.id)}
            style={styles.chip}
          />
        ))}
      </View>

      <Text style={styles.label}>To</Text>
      <View style={styles.chipRow}>
        {openAccounts
          .filter((a) => a.id !== fromAccountId)
          .map((a) => (
            <PrimaryButton
              key={a.id}
              title={a.name}
              variant={toAccountId === a.id ? "primary" : "secondary"}
              onPress={() => setToAccountId(a.id)}
              style={styles.chip}
            />
          ))}
      </View>

      <FormField label="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="100.00" />
      <FormField label="Note (optional)" value={note} onChangeText={setNote} placeholder="Weekly cash deposit" />

      <PrimaryButton title="Transfer funds" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, minWidth: 90 },
});
