import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchLedger } from "../../api/accounts";
import { LedgerTransaction } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { SelectField } from "../../components/SelectField";
import { apiErrorMessage } from "../../api/client";
import { AppIcon } from "../../components/AppIcon";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

const ALL_ACCOUNTS = "ALL";

export function LedgerScreen() {
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["ledger"],
    queryFn: fetchLedger,
  });
  const [accountFilter, setAccountFilter] = useState<string>(ALL_ACCOUNTS);

  // Only meaningful once a single account is picked — a running balance
  // across several accounts' transactions mixed together isn't a real
  // number, so it's computed (and shown) only in that case.
  const rows = useMemo(() => {
    if (!data) return [];
    if (accountFilter === ALL_ACCOUNTS) return data.transactions;

    const forAccount = data.transactions.filter((t) => t.accountId === accountFilter);
    const ascending = [...forAccount].sort(
      (a, b) => new Date(a.operationDate).getTime() - new Date(b.operationDate).getTime()
    );
    let running = 0;
    const withBalance = ascending.map((t) => {
      running += t.type === "CREDIT" ? t.amount : -t.amount;
      return { ...t, runningBalance: running };
    });
    return withBalance.reverse();
  }, [data, accountFilter]);

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  const accountName = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? "";
  const isFiltered = accountFilter !== ALL_ACCOUNTS;

  return (
    <View style={styles.container}>
      <View style={styles.intro}><Text style={styles.eyebrow}>FINANCIAL POSITION</Text><Text style={styles.heading}>Cash at a glance</Text><Text style={styles.subtitle}>Live balances across every operating account.</Text></View>
      <View style={styles.balanceRow}>
        {data.accounts.map((account) => (
          <Card key={account.id} style={styles.balanceCard}><View style={styles.balanceHeader}><View style={styles.accountIcon}><AppIcon name="briefcase" size={16} color={colors.teal} /></View><Text style={styles.balanceLabel}>{account.name}</Text></View>
            <Text style={[styles.balanceValue, account.balance < 0 && styles.negative]}>
              ₹{account.balance.toFixed(2)}
            </Text>
          </Card>
        ))}
      </View>

      <View style={styles.filterWrap}>
        <SelectField
          label="Account"
          value={accountFilter}
          onSelect={setAccountFilter}
          options={[{ value: ALL_ACCOUNTS, label: "All accounts" }, ...data.accounts.map((a) => ({ value: a.id, label: a.name }))]}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={rows.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={<EmptyState title="No transactions yet" subtitle="Sales and purchases will show up here." />}
        renderItem={({ item }: { item: LedgerTransaction & { runningBalance?: number } }) => {
          const isCredit = item.type === "CREDIT";
          return (
            <Card style={styles.transactionCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.meta}>{new Date(item.operationDate).toDateString()}</Text>
              </View>

              {isFiltered ? (
                <View style={styles.ledgerCols}>
                  <View style={styles.ledgerCol}>
                    <Text style={styles.colLabel}>Debit</Text>
                    <Text style={styles.colValue}>{!isCredit ? `₹${item.amount.toFixed(2)}` : "—"}</Text>
                  </View>
                  <View style={styles.ledgerCol}>
                    <Text style={styles.colLabel}>Credit</Text>
                    <Text style={styles.colValue}>{isCredit ? `₹${item.amount.toFixed(2)}` : "—"}</Text>
                  </View>
                  <View style={styles.ledgerCol}>
                    <Text style={styles.colLabel}>Balance</Text>
                    <Text style={[styles.colValue, styles.colBalance]}>₹{(item.runningBalance ?? 0).toFixed(2)}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.rowBetween}>
                  <Text style={styles.meta}>{accountName(item.accountId)}</Text>
                  <Text style={[styles.amount, isCredit ? styles.positive : styles.negative]}>
                    {isCredit ? "+" : "−"}₹{item.amount.toFixed(2)}
                  </Text>
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas }, intro: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 4 }, eyebrow: { color: colors.teal, fontSize: 11, letterSpacing: 1, fontWeight: "800" }, heading: { color: colors.ocean, fontSize: 25, fontWeight: "800", marginTop: 4 }, subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 4 },
  balanceRow: { flexDirection: "row", paddingHorizontal: 4, paddingTop: 16 }, balanceCard: { flex: 1 }, balanceHeader: { flexDirection: "row", alignItems: "center", gap: 7 }, accountIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" }, balanceLabel: { fontSize: 13, fontWeight: "700", color: colors.inkMuted }, balanceValue: { fontSize: 22, fontWeight: "800", color: colors.ink, marginTop: 10 },
  filterWrap: { paddingHorizontal: 16, paddingTop: 12 },
  listContent: { paddingTop: 4 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  transactionCard: { marginHorizontal: 16 }, description: { fontSize: 15, fontWeight: "800", color: colors.ink, flexShrink: 1 }, amount: { fontSize: 15, fontWeight: "800" }, positive: { color: colors.success }, negative: { color: colors.coral }, meta: { fontSize: 13, color: colors.inkMuted, marginTop: 5 },
  ledgerCols: { flexDirection: "row", marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 8 },
  ledgerCol: { flex: 1 },
  colLabel: { fontSize: 10, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase", letterSpacing: 0.4 },
  colValue: { fontSize: 13, fontWeight: "700", color: colors.ink, marginTop: 2 },
  colBalance: { color: colors.tealDark, fontWeight: "800" },
});
