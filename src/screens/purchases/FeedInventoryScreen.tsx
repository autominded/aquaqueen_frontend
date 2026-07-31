import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFeedInventory, fetchFeedInventoryLedger } from "../../api/feedCatalog";
import { clearFeedStockThreshold, fetchFeedStockThresholds, setFeedStockThreshold } from "../../api/tasks";
import { FeedInventoryItem } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusPill } from "../../components/StatusPill";
import { AppIcon } from "../../components/AppIcon";
import { apiErrorMessage } from "../../api/client";
import { useUnits } from "../../context/UnitsContext";
import { colors } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Purchased minus consumed, computed on the server at read time (see
// GET /feed-catalog/inventory) — not a running balance kept in sync here.
export function FeedInventoryScreen() {
  const { formatMass } = useUnits();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["feed-inventory"],
    queryFn: fetchFeedInventory,
  });
  const thresholdsQuery = useQuery({ queryKey: ["feed-stock-thresholds"], queryFn: fetchFeedStockThresholds });
  const thresholdByPelletSize = new Map((thresholdsQuery.data ?? []).map((t) => [t.pelletSizeId, t.thresholdKg]));

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.pelletSizeId}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState title="No pellet sizes configured yet" subtitle="Add them from the super admin Feed catalog screen." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setExpandedId((prev) => (prev === item.pelletSizeId ? null : item.pelletSizeId))}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>{item.label}</Text>
                <View style={styles.headerRight}>
                  <StatusPill
                    label={item.stockKg < 0 ? "OVER" : item.stockKg === 0 ? "EMPTY" : "IN STOCK"}
                    tone={item.stockKg < 0 ? "critical" : item.stockKg === 0 ? "neutral" : "success"}
                  />
                  <AppIcon name={expandedId === item.pelletSizeId ? "chevron-up" : "chevron-down"} size={18} color={colors.inkMuted} />
                </View>
              </View>
              <Text style={styles.stock}>{formatMass(item.stockKg)}</Text>
              <View style={styles.divider} />
              <View style={styles.rowBetween}>
                <Text style={styles.meta}>Purchased: {formatMass(item.purchasedKg)}</Text>
                <Text style={styles.meta}>Fed: {formatMass(item.consumedKg)}</Text>
              </View>

              {expandedId === item.pelletSizeId && (
                <>
                  <ThresholdEditor pelletSizeId={item.pelletSizeId} thresholdKg={thresholdByPelletSize.get(item.pelletSizeId)} />
                  {item.byManufacturer.length > 0 && (
                    <View style={styles.ledger}>
                      <View style={styles.ledgerDivider} />
                      <Text style={styles.ledgerTitle}>By brand</Text>
                      {item.byManufacturer.map((m) => (
                        <View key={m.feedManufacturerId} style={styles.ledgerRow}>
                          <Text style={styles.ledgerBatch}>{m.name}</Text>
                          <Text style={styles.ledgerQty}>{formatMass(m.stockKg)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <UsageLedger item={item} />
                </>
              )}
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// Threshold set once per pellet size, org-scoped — checked by
// GET /dashboard/alerts against the same stockKg this screen already shows.
function ThresholdEditor({ pelletSizeId, thresholdKg }: { pelletSizeId: string; thresholdKg: number | undefined }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thresholdKg != null ? String(thresholdKg) : "");

  const saveMutation = useMutation({
    mutationFn: () => setFeedStockThreshold(pelletSizeId, Number(draft)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed-stock-thresholds"] });
      setEditing(false);
    },
  });
  const clearMutation = useMutation({
    mutationFn: () => clearFeedStockThreshold(pelletSizeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-stock-thresholds"] }),
  });

  if (!editing) {
    return (
      <View style={styles.thresholdRow}>
        <Text style={styles.meta}>{thresholdKg != null ? `Low-stock alert below ${thresholdKg}kg` : "No low-stock alert set"}</Text>
        <View style={styles.thresholdLinks}>
          {thresholdKg != null && (
            <TouchableOpacity onPress={() => clearMutation.mutate()}>
              <Text style={styles.thresholdEditLink}>Clear</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => { setDraft(thresholdKg != null ? String(thresholdKg) : ""); setEditing(true); }}>
            <Text style={styles.thresholdEditLink}>{thresholdKg != null ? "Edit" : "Set"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.thresholdEditRow}>
      <FormField label="" value={draft} onChangeText={setDraft} keyboardType="numeric" placeholder="Alert below (kg)" style={styles.thresholdInput} />
      <PrimaryButton title="Save" onPress={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!(Number(draft) > 0)} style={styles.thresholdSaveButton} />
      <PrimaryButton title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.thresholdSaveButton} />
    </View>
  );
}

function UsageLedger({ item }: { item: FeedInventoryItem }) {
  const { formatMass } = useUnits();
  const ledgerQuery = useQuery({
    queryKey: ["feed-inventory-ledger", item.pelletSizeId],
    queryFn: () => fetchFeedInventoryLedger(item.pelletSizeId),
  });

  return (
    <View style={styles.ledger}>
      <View style={styles.ledgerDivider} />
      <Text style={styles.ledgerTitle}>Usage history</Text>
      {ledgerQuery.isPending && <Text style={styles.meta}>Loading…</Text>}
      {ledgerQuery.isError && <ErrorBanner message={apiErrorMessage(ledgerQuery.error)} onRetry={ledgerQuery.refetch} />}
      {ledgerQuery.data?.length === 0 && <Text style={styles.meta}>No feed logged against this size yet.</Text>}
      {ledgerQuery.data?.map((entry) => (
        <View key={entry.id} style={styles.ledgerRow}>
          <View style={styles.ledgerCopy}>
            <Text style={styles.ledgerBatch}>
              {entry.batchCode}
              {entry.racewayName ? ` · ${entry.racewayName}` : ""}
            </Text>
            <Text style={styles.ledgerMeta}>
              {formatDate(entry.date)}
              {entry.manufacturerName ? ` · ${entry.manufacturerName}` : ""}
            </Text>
          </View>
          <Text style={styles.ledgerQty}>{formatMass(entry.quantityKg)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  listContent: { paddingVertical: 16 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 16, fontWeight: "800", color: colors.ink },
  stock: { fontSize: 24, fontWeight: "800", color: colors.tealDark, marginTop: 8 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  meta: { fontSize: 12, color: colors.inkMuted },
  ledger: { marginTop: 4 },
  ledgerDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  ledgerTitle: { fontSize: 13, fontWeight: "800", color: colors.ocean, marginBottom: 10 },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  ledgerCopy: { flex: 1 },
  ledgerBatch: { fontSize: 13, fontWeight: "700", color: colors.ink },
  ledgerMeta: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  ledgerQty: { fontSize: 13, fontWeight: "800", color: colors.tealDark },
  thresholdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  thresholdLinks: { flexDirection: "row", gap: 12 },
  thresholdEditLink: { fontSize: 12, fontWeight: "700", color: colors.teal },
  thresholdEditRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 },
  thresholdInput: { flex: 1, marginBottom: 0 },
  thresholdSaveButton: { flexGrow: 0 },
});
