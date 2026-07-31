import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { createStockTransfer, fetchStockTransfers } from "../../api/tasks";
import { fetchBatches } from "../../api/batches";
import { fetchFarm } from "../../api/farm";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { DateField } from "../../components/DateField";
import { apiErrorMessage } from "../../api/client";
import { colors } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<BatchesStackParamList, "StockTransfers">;

export function StockTransfersScreen(_props: Props) {
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["stock-transfers"], queryFn: fetchStockTransfers });
  const batchesQuery = useQuery({ queryKey: ["batches"], queryFn: fetchBatches });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });

  const [adding, setAdding] = useState(false);
  const [fromBatchId, setFromBatchId] = useState<string | undefined>(undefined);
  const [fromRacewayId, setFromRacewayId] = useState<string | undefined>(undefined);
  const [toBatchId, setToBatchId] = useState<string | undefined>(undefined);
  const [toRacewayId, setToRacewayId] = useState<string | undefined>(undefined);
  const [count, setCount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");

  const resetForm = () => {
    setAdding(false);
    setFromBatchId(undefined);
    setFromRacewayId(undefined);
    setToBatchId(undefined);
    setToRacewayId(undefined);
    setCount("");
    setDate(new Date().toISOString().slice(0, 10));
    setReason("");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createStockTransfer({
        fromBatchId: fromBatchId!,
        fromRacewayId: fromRacewayId!,
        toBatchId: toBatchId!,
        toRacewayId: toRacewayId!,
        count: Number(count),
        date,
        reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      resetForm();
    },
  });

  const canSubmit =
    Boolean(fromBatchId && fromRacewayId && toBatchId && toRacewayId) && Number(count) > 0 && date.length > 0;

  const batchOptions = (batchesQuery.data ?? []).map((b) => ({ label: `${b.code} — ${b.species}`, value: b.id }));
  const racewayOptions = (farmQuery.data?.raceways ?? []).map((r) => ({ label: r.name, value: r.id }));

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.addSection}>
            {isError && <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />}
            {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
            {adding ? (
              <Card style={styles.addCard}>
                <Text style={styles.groupLabel}>From</Text>
                <SelectField label="Batch" value={fromBatchId} onSelect={setFromBatchId} options={batchOptions} />
                <SelectField label="Raceway" value={fromRacewayId} onSelect={setFromRacewayId} options={racewayOptions} />
                <Text style={styles.groupLabel}>To</Text>
                <SelectField label="Batch" value={toBatchId} onSelect={setToBatchId} options={batchOptions} />
                <SelectField label="Raceway" value={toRacewayId} onSelect={setToRacewayId} options={racewayOptions} />
                <FormField label="Count" value={count} onChangeText={setCount} keyboardType="numeric" placeholder="500" />
                <DateField label="Date" value={date} onChange={setDate} />
                <FormField label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="Grading — small vs large" multiline />
                <View style={styles.addActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={resetForm} style={styles.addButton} />
                  <PrimaryButton title="Move stock" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} style={styles.addButton} />
                </View>
              </Card>
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.addLink}>+ New grading / stock transfer</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? <LoadingView /> : <EmptyState title="No stock transfers yet" subtitle="Move fish between raceways or batches for grading above." />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Text style={styles.title}>{item.count.toLocaleString()} fish moved</Text>
            <Text style={styles.meta}>
              {item.fromBatch.code} / {item.fromRaceway.name} → {item.toBatch.code} / {item.toRaceway.name}
            </Text>
            <Text style={styles.meta}>{item.date.slice(0, 10)} · {item.createdBy.name}</Text>
            {item.reason && <Text style={styles.meta}>{item.reason}</Text>}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  listContent: { paddingVertical: 16 },
  addSection: { paddingHorizontal: 16, marginBottom: 4 },
  addLink: { fontSize: 13, fontWeight: "700", color: colors.teal, marginBottom: 12 },
  addCard: { marginHorizontal: 0, marginBottom: 12 },
  addActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  addButton: { flex: 1 },
  groupLabel: { fontSize: 12, fontWeight: "800", color: colors.teal, letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase" },
  card: {},
  title: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
});
