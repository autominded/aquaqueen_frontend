import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { fetchLedger } from "../../api/accounts";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<PurchasesStackParamList, "Accounts">;

export function AccountsScreen({ navigation }: Props) {
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["ledger"],
    queryFn: fetchLedger,
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PrimaryButton title="+ New account" onPress={() => navigation.navigate("NewAccount")} style={styles.headerButton} />
        <PrimaryButton
          title="Transfer funds"
          variant="secondary"
          onPress={() => navigation.navigate("TransferFunds")}
          style={styles.headerButton}
        />
      </View>
      <FlatList
        data={data.accounts}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("AccountDetail", { accountId: item.id })}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={[styles.balance, item.balance < 0 && styles.negative]}>${item.balance.toFixed(2)}</Text>
              </View>
              <Text style={styles.meta}>{item.type === "CASH" ? "Cash" : "Bank"}{item.isClosed ? " · Closed" : ""}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  header: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 4 },
  headerButton: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: "#1c2424" },
  balance: { fontSize: 15, fontWeight: "700", color: "#0b6e6e" },
  negative: { color: "#c0392b" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
});
