import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalesStackParamList } from "../../navigation/types";
import { deleteSale, fetchSales } from "../../api/pos";
import { fetchFarm } from "../../api/farm";
import { Sale } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PaymentStatusBadge } from "../../components/PaymentStatusBadge";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { printReceipt } from "../../lib/receipt";
import { confirmAction } from "../../lib/confirm";
import { notify } from "../../lib/notify";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<SalesStackParamList, "SalesHistory">;

export function SalesHistoryScreen({ navigation }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["sales"],
    queryFn: fetchSales,
  });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });

  const deleteMutation = useMutation({
    mutationFn: (saleId: string) => deleteSale(saleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      // Deleting a sale restores any batch fish count its piece-count lines
      // had decremented — refresh everywhere that's shown.
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      queryClient.invalidateQueries({ queryKey: ["raceway-operations"] });
    },
    onError: (err) => notify("Couldn't delete sale", apiErrorMessage(err)),
  });

  const confirmDelete = (sale: Sale) => {
    confirmAction(
      {
        title: "Delete sale?",
        message: "This restores stock and reverses its ledger entries. This can't be undone from the app.",
        confirmLabel: "Delete",
        destructive: true,
      },
      () => deleteMutation.mutate(sale.id)
    );
  };

  const print = async (sale: Sale) => {
    try {
      await printReceipt(sale, farmQuery.data ?? null, user?.organizationName ?? "AquaQueen");
    } catch (err) {
      notify("Couldn't print receipt", apiErrorMessage(err));
    }
  };

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={<EmptyState title="No sales yet" subtitle="Sales you ring up at the POS will show up here." />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>
                {item.items.length} item{item.items.length === 1 ? "" : "s"}
              </Text>
              <Text style={styles.amount}>₹{item.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>{new Date(item.createdAt).toDateString()}</Text>
              <PaymentStatusBadge status={item.paymentStatus} />
            </View>
            <Text style={styles.meta}>
              {[
                item.contact?.name,
                item.payments.length > 0 && `Paid to ${item.payments.map((p) => p.account?.name ?? "account").join(" + ")}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <View style={styles.actionsRow}>
              {item.paymentStatus !== "PAID" && (
                <TouchableOpacity onPress={() => navigation.navigate("RecordSalePayment", { saleId: item.id })}>
                  <Text style={styles.actionLink}>Record payment</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => navigation.navigate("EditSale", { saleId: item.id })}>
                <Text style={styles.actionLink}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => print(item)}>
                <Text style={styles.actionLink}>Print</Text>
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
  title: { fontSize: 15, fontWeight: "700", color: "#1c2424" },
  amount: { fontSize: 15, fontWeight: "700", color: "#0b6e6e" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 10 },
  actionLink: { fontSize: 13, fontWeight: "700", color: "#0b6e6e" },
  deleteLink: { fontSize: 13, fontWeight: "700", color: "#c0392b" },
});
