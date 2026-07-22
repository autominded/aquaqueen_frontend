import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchLedger } from "../../api/accounts";
import { LedgerTransaction } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { apiErrorMessage } from "../../api/client";

export function LedgerScreen() {
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["ledger"],
    queryFn: fetchLedger,
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  const accountName = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? "";

  return (
    <View style={styles.container}>
      <View style={styles.balanceRow}>
        {data.accounts.map((account) => (
          <Card key={account.id} style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{account.name}</Text>
            <Text style={[styles.balanceValue, account.balance < 0 && styles.negative]}>
              ${account.balance.toFixed(2)}
            </Text>
          </Card>
        ))}
      </View>

      <FlatList
        data={data.transactions}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={data.transactions.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={<EmptyState title="No transactions yet" subtitle="Sales and purchases will show up here." />}
        renderItem={({ item }: { item: LedgerTransaction }) => {
          const isCredit = item.type === "CREDIT";
          return (
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={[styles.amount, isCredit ? styles.positive : styles.negative]}>
                  {isCredit ? "+" : "−"}${item.amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.meta}>{accountName(item.accountId)}</Text>
                <Text style={styles.meta}>{new Date(item.operationDate).toDateString()}</Text>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  balanceRow: { flexDirection: "row", paddingHorizontal: 4, paddingTop: 16 },
  balanceCard: { flex: 1 },
  balanceLabel: { fontSize: 13, fontWeight: "600", color: "#7a8787" },
  balanceValue: { fontSize: 22, fontWeight: "700", color: "#1c2424", marginTop: 4 },
  listContent: { paddingTop: 4 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  description: { fontSize: 15, fontWeight: "700", color: "#1c2424", flexShrink: 1 },
  amount: { fontSize: 15, fontWeight: "700" },
  positive: { color: "#0b6e6e" },
  negative: { color: "#c0392b" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
});
