import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { deleteBatch, fetchBatches } from "../../api/batches";
import { Batch } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { AppIcon } from "../../components/AppIcon";
import { StatusPill } from "../../components/StatusPill";
import { confirmAction } from "../../lib/confirm";
import { notify } from "../../lib/notify";
import { useRefreshing } from "../../lib/useRefreshing";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "BatchList">;

const STAGE_LABEL: Record<Batch["stage"], string> = {
  FINGERLING: "Fingerling",
  JUVENILE: "Juvenile",
  ADULT: "Adult",
  BROODER: "Brooder",
};

export function BatchListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasPermission("batches.manage");
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
  });
  const { refreshing, onRefresh } = useRefreshing();

  const deleteMutation = useMutation({
    mutationFn: (batchId: string) => deleteBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
    },
    onError: (err) => notify("Couldn't delete batch", apiErrorMessage(err)),
  });

  const confirmDelete = (batch: Batch) => {
    confirmAction(
      {
        title: "Delete batch?",
        message: `${batch.code}'s feed, sampling, mortality, and water-quality history stays on record, but the batch itself won't show up anywhere active. This can't be undone from the app.`,
        confirmLabel: "Delete",
        destructive: true,
      },
      () => deleteMutation.mutate(batch.id)
    );
  };

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      {canManage && (
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>OPERATIONS</Text><Text style={styles.heading}>Fish batches</Text></View>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("NewBatch")} accessibilityLabel="Create a new batch">
            <Text style={styles.addButtonText}>New batch</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <EmptyState title="No batches yet" subtitle="Create your first batch to start tracking production." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("BatchDetails", { batchId: item.id })}>
            <Card style={styles.batchCard}>
              <View style={styles.rowBetween}>
                <View><Text style={styles.code}>{item.code}</Text><Text style={styles.species}>{item.species}</Text></View>
                <StatusPill label={item.status === "ACTIVE" ? "ACTIVE" : item.status} tone={item.status === "ACTIVE" ? "success" : "neutral"} />
              </View>
              <View style={styles.divider} />
              <View style={styles.metadata}>
                <View style={styles.metaItem}><AppIcon name="map-pin" size={15} color={colors.inkMuted} /><Text style={styles.meta}>{STAGE_LABEL[item.stage]} · {item.location}</Text></View>
                <View style={styles.metaItem}><AppIcon name="activity" size={15} color={colors.teal} /><Text style={styles.fishCount}>{item.currentCount.toLocaleString()} fish</Text></View>
              </View>
              {canManage && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => navigation.navigate("EditBatch", { batchId: item.id })}>
                    <Text style={styles.actionLink}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete(item)}>
                    <Text style={styles.deleteLink}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.teal },
  heading: { color: colors.ocean, fontSize: 26, fontWeight: "800", marginTop: 3 },
  addButton: { backgroundColor: colors.teal, minHeight: 40, paddingHorizontal: 13, borderRadius: radii.sm, justifyContent: "center", alignItems: "center" },
  addButtonText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  batchCard: { marginHorizontal: 16 },
  code: { fontSize: 18, fontWeight: "800", color: colors.ink },
  species: { fontSize: 13, color: colors.inkMuted, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 13 },
  metadata: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  meta: { fontSize: 12, color: colors.inkMuted, flexShrink: 1 },
  fishCount: { fontSize: 12, color: colors.tealDark, fontWeight: "800" },
  actionsRow: { flexDirection: "row", gap: 16, marginTop: 12 },
  actionLink: { fontSize: 13, fontWeight: "700", color: colors.teal },
  deleteLink: { fontSize: 13, fontWeight: "700", color: colors.coral },
});
