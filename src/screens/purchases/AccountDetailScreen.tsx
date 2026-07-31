import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { closeAccount, fetchLedger, reopenAccount } from "../../api/accounts";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<PurchasesStackParamList, "AccountDetail">;

export function AccountDetailScreen({ route, navigation }: Props) {
  const { accountId } = route.params;
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["ledger"], queryFn: fetchLedger });
  const { refreshing, onRefresh } = useRefreshing();

  const closeMutation = useMutation({
    mutationFn: () => closeAccount(accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger"] }),
  });
  const reopenMutation = useMutation({
    mutationFn: () => reopenAccount(accountId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ledger"] }),
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) return <EmptyState title="Account not found" />;

  const transactions = data.transactions.filter((t) => t.accountId === accountId);

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{account.name}</Text>
          <Text style={[styles.balance, account.balance < 0 && styles.negative]}>₹{account.balance.toFixed(2)}</Text>
        </View>
        <Text style={styles.meta}>{account.type === "CASH" ? "Cash" : "Bank"}{account.isClosed ? " · Closed" : ""}</Text>
      </Card>

      {closeMutation.isError && <ErrorBanner message={apiErrorMessage(closeMutation.error)} />}
      {reopenMutation.isError && <ErrorBanner message={apiErrorMessage(reopenMutation.error)} />}

      <View style={styles.actionsRow}>
        <PrimaryButton
          title="Deposit"
          variant="secondary"
          onPress={() => navigation.navigate("DepositFunds", { accountId })}
          style={styles.actionButton}
          disabled={account.isClosed}
        />
        <PrimaryButton
          title="Transfer"
          variant="secondary"
          onPress={() => navigation.navigate("TransferFunds")}
          style={styles.actionButton}
          disabled={account.isClosed}
        />
      </View>

      <PrimaryButton
        title={account.isClosed ? "Reopen account" : "Close account"}
        variant="secondary"
        onPress={() => (account.isClosed ? reopenMutation.mutate() : closeMutation.mutate())}
        loading={closeMutation.isPending || reopenMutation.isPending}
        style={styles.closeButton}
      />

      <Text style={styles.sectionTitle}>Transactions</Text>
      {transactions.length === 0 && <EmptyState title="No transactions yet" />}
      {transactions.map((t) => (
        <Card key={t.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.description}>{t.description}</Text>
            <Text style={[styles.amount, t.type === "CREDIT" ? styles.positive : styles.negative]}>
              {t.type === "CREDIT" ? "+" : "−"}₹{t.amount.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.meta}>{new Date(t.operationDate).toDateString()}</Text>
        </Card>
      ))}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 17, fontWeight: "700", color: "#1c2424" },
  balance: { fontSize: 20, fontWeight: "700", color: "#0b6e6e" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  actionButton: { flex: 1 },
  closeButton: { marginTop: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1c2424", marginTop: 20, marginBottom: 8 },
  description: { fontSize: 14, fontWeight: "600", color: "#1c2424", flexShrink: 1 },
  amount: { fontSize: 14, fontWeight: "700" },
  positive: { color: "#0b6e6e" },
  negative: { color: "#c0392b" },
});
