import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import {
  createFarmInventoryItem,
  fetchFarmInventoryEntries,
  fetchFarmInventoryItems,
  updateFarmInventoryItem,
} from "../../api/farmInventory";
import { FarmInventoryItem } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AppIcon } from "../../components/AppIcon";
import { apiErrorMessage } from "../../api/client";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<PurchasesStackParamList, "FarmInventory">;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Equipment/supplies register, separate from Feed Inventory — no consumption
// side, just a running total of pieces added (see FarmInventoryEntry).
export function FarmInventoryScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["farm-inventory"],
    queryFn: fetchFarmInventoryItems,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const createItemMutation = useMutation({
    mutationFn: () => createFarmInventoryItem(newItemName.trim()),
    onSuccess: () => {
      setNewItemName("");
      setAddingItem(false);
      queryClient.invalidateQueries({ queryKey: ["farm-inventory"] });
    },
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

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
            {createItemMutation.isError && <ErrorBanner message={apiErrorMessage(createItemMutation.error)} />}
            {addingItem ? (
              <Card style={styles.addCard}>
                <FormField label="Item name" value={newItemName} onChangeText={setNewItemName} placeholder="Aerator pump" />
                <View style={styles.addActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={() => setAddingItem(false)} style={styles.addButton} />
                  <PrimaryButton
                    title="Add item"
                    onPress={() => createItemMutation.mutate()}
                    loading={createItemMutation.isPending}
                    disabled={!newItemName.trim()}
                    style={styles.addButton}
                  />
                </View>
              </Card>
            ) : (
              <TouchableOpacity onPress={() => setAddingItem(true)}>
                <Text style={styles.addLink}>+ Add inventory item</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No inventory items yet" subtitle="Add an item above to start tracking stock." />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <TouchableOpacity onPress={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>{item.name}</Text>
                <AppIcon name={expandedId === item.id ? "chevron-up" : "chevron-down"} size={18} color={colors.inkMuted} />
              </View>
              <Text style={styles.qty}>{item.quantityOnHand.toLocaleString()} pcs</Text>
            </TouchableOpacity>

            {expandedId === item.id && (
              <>
                <ThresholdEditor item={item} />
                <InventoryLedger item={item} />
              </>
            )}

            <PrimaryButton
              title="Add stock"
              variant="secondary"
              onPress={() => navigation.navigate("AddFarmInventoryEntry", { itemId: item.id, itemName: item.name })}
              style={styles.stockButton}
            />
          </Card>
        )}
      />
    </View>
  );
}

// Low-stock alerting is threshold-based (set once, checked by
// GET /dashboard/alerts on every read) rather than a reminder re-entered
// each time — matches the same pattern used for feed pellet-size thresholds.
function ThresholdEditor({ item }: { item: FarmInventoryItem }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.lowStockThreshold != null ? String(item.lowStockThreshold) : "");

  const saveMutation = useMutation({
    mutationFn: () => updateFarmInventoryItem(item.id, { lowStockThreshold: Number(draft) > 0 ? Number(draft) : null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm-inventory"] });
      setEditing(false);
    },
  });

  if (!editing) {
    return (
      <View style={styles.thresholdRow}>
        <Text style={styles.meta}>
          {item.lowStockThreshold != null ? `Low-stock alert below ${item.lowStockThreshold.toLocaleString()} pcs` : "No low-stock alert set"}
        </Text>
        <TouchableOpacity onPress={() => { setDraft(item.lowStockThreshold != null ? String(item.lowStockThreshold) : ""); setEditing(true); }}>
          <Text style={styles.thresholdEditLink}>{item.lowStockThreshold != null ? "Edit" : "Set"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.thresholdEditRow}>
      <FormField label="" value={draft} onChangeText={setDraft} keyboardType="numeric" placeholder="Alert below…" style={styles.thresholdInput} />
      <PrimaryButton title="Save" onPress={() => saveMutation.mutate()} loading={saveMutation.isPending} style={styles.thresholdSaveButton} />
      <PrimaryButton title="Cancel" variant="secondary" onPress={() => setEditing(false)} style={styles.thresholdSaveButton} />
    </View>
  );
}

function InventoryLedger({ item }: { item: FarmInventoryItem }) {
  const entriesQuery = useQuery({
    queryKey: ["farm-inventory-entries", item.id],
    queryFn: () => fetchFarmInventoryEntries(item.id),
  });

  return (
    <View style={styles.ledger}>
      <View style={styles.ledgerDivider} />
      <Text style={styles.ledgerTitle}>Additions</Text>
      {entriesQuery.isPending && <Text style={styles.meta}>Loading…</Text>}
      {entriesQuery.isError && <ErrorBanner message={apiErrorMessage(entriesQuery.error)} onRetry={entriesQuery.refetch} />}
      {entriesQuery.data?.length === 0 && <Text style={styles.meta}>No stock added yet.</Text>}
      {entriesQuery.data?.map((entry) => (
        <View key={entry.id} style={styles.ledgerRow}>
          <View style={styles.ledgerCopy}>
            <Text style={styles.ledgerQty}>+{entry.quantity} pcs</Text>
            <Text style={styles.ledgerMeta}>
              {formatDate(entry.date)} · ₹{entry.purchasePrice.toFixed(2)}/pc
            </Text>
          </View>
          <Text style={styles.ledgerTotal}>₹{(entry.quantity * entry.purchasePrice).toFixed(2)}</Text>
        </View>
      ))}
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
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  card: {},
  label: { fontSize: 16, fontWeight: "800", color: colors.ink },
  qty: { fontSize: 22, fontWeight: "800", color: colors.tealDark, marginTop: 8 },
  meta: { fontSize: 12, color: colors.inkMuted },
  stockButton: { marginTop: 12 },
  thresholdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  thresholdEditLink: { fontSize: 12, fontWeight: "700", color: colors.teal },
  thresholdEditRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 4 },
  thresholdInput: { flex: 1, marginBottom: 0 },
  thresholdSaveButton: { flexGrow: 0 },
  ledger: { marginTop: 4 },
  ledgerDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  ledgerTitle: { fontSize: 13, fontWeight: "800", color: colors.ocean, marginBottom: 10 },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  ledgerCopy: { flex: 1 },
  ledgerQty: { fontSize: 13, fontWeight: "700", color: colors.ink },
  ledgerMeta: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  ledgerTotal: { fontSize: 13, fontWeight: "800", color: colors.tealDark },
});
