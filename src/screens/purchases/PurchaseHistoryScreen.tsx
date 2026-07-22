import React from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { deletePurchase, fetchPurchases } from "../../api/purchases";
import { Purchase } from "../../api/types";
import { CATEGORY_LABEL } from "./categories";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PaymentStatusBadge } from "../../components/PaymentStatusBadge";
import { apiErrorMessage } from "../../api/client";
import { confirmAction } from "../../lib/confirm";

type Props = NativeStackScreenProps<PurchasesStackParamList, "PurchaseHistory">;

export function PurchaseHistoryScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["purchases"],
    queryFn: fetchPurchases,
  });

  const deleteMutation = useMutation({
    mutationFn: (purchaseId: string) => deletePurchase(purchaseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
    },
    onError: (err) => Alert.alert("Couldn't delete purchase", apiErrorMessage(err)),
  });

  const confirmDelete = (purchase: Purchase) => {
    confirmAction(
      {
        title: "Delete purchase?",
        message: "This reverses its ledger entries. This can't be undone from the app.",
        confirmLabel: "Delete",
        destructive: true,
      },
      () => deleteMutation.mutate(purchase.id)
    );
  };

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={<EmptyState title="No purchases logged yet" subtitle="Log your first purchase to start tracking farm spend." />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.cost}>${item.totalCost.toFixed(2)}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.category}>{CATEGORY_LABEL[item.category]}</Text>
              <PaymentStatusBadge status={item.paymentStatus} />
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>
                {item.quantity.toLocaleString()} {item.unit} · ${item.unitCost.toFixed(2)}/{item.unit}
              </Text>
              <Text style={styles.meta}>{new Date(item.purchaseDate).toDateString()}</Text>
            </View>
            <Text style={styles.meta}>
              {[
                item.contact?.name,
                item.payments.length > 0 && `Paid from ${item.payments.map((p) => p.account?.name ?? "account").join(" + ")}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <View style={styles.actionsRow}>
              {item.paymentStatus !== "PAID" && (
                <TouchableOpacity onPress={() => navigation.navigate("RecordPurchasePayment", { purchaseId: item.id })}>
                  <Text style={styles.actionLink}>Record payment</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigation.navigate("EditPurchase", { purchaseId: item.id })}>
                <Text style={styles.actionLink}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item)}>
                <Text style={styles.deleteLink}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  listContent: { paddingTop: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  description: { fontSize: 15, fontWeight: "700", color: "#1c2424", flexShrink: 1 },
  cost: { fontSize: 15, fontWeight: "700", color: "#0b6e6e" },
  category: { fontSize: 12, fontWeight: "700", color: "#0b6e6e", marginTop: 4 },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 10 },
  actionLink: { fontSize: 13, fontWeight: "700", color: "#0b6e6e" },
  deleteLink: { fontSize: 13, fontWeight: "700", color: "#c0392b" },
});
