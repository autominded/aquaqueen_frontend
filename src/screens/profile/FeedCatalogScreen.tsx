import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRefreshing } from "../../lib/useRefreshing";
import {
  createFeedManufacturer,
  createPelletSize,
  deleteFeedManufacturer,
  deletePelletSize,
  fetchFeedManufacturers,
  fetchPelletSizes,
} from "../../api/feedCatalog";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { confirmAction } from "../../lib/confirm";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { colors } from "../../theme";

// Platform-wide catalogs every farm's New purchase (FEED category) screen
// reads from — gated to super admins only via the ProfileScreen menu entry
// that routes here (same trust boundary as AdminSettingsScreen).
export function FeedCatalogScreen() {
  const { refreshing, onRefresh } = useRefreshing();

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      <ManufacturersSection />
      <PelletSizesSection />
    </RefreshableScrollView>
  );
}

function ManufacturersSection() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["feed-manufacturers"],
    queryFn: fetchFeedManufacturers,
  });
  const [name, setName] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createFeedManufacturer(name.trim()),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["feed-manufacturers"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeedManufacturer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed-manufacturers"] }),
  });

  const confirmDelete = (id: string, label: string) => {
    confirmAction(
      { title: "Remove manufacturer?", message: `"${label}" will no longer be selectable for new feed purchases.`, confirmLabel: "Remove", destructive: true },
      () => deleteMutation.mutate(id)
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Feed manufacturers</Text>
      <Text style={styles.hint}>Shown as a dropdown when logging a FEED-category purchase.</Text>

      {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
      <View style={styles.addRow}>
        <FormField label="Manufacturer name" value={name} onChangeText={setName} placeholder="Skretting" style={styles.addField} />
      </View>
      <PrimaryButton title="Add manufacturer" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!name.trim()} style={styles.addButton} />

      {isPending && <LoadingView />}
      {isError && <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />}
      {data?.length === 0 && <EmptyState title="No manufacturers yet" />}
      {data?.map((m) => (
        <Card key={m.id} style={styles.row}>
          <Text style={styles.rowLabel}>{m.name}</Text>
          <TouchableOpacity onPress={() => confirmDelete(m.id, m.name)}>
            <Text style={styles.removeLink}>Remove</Text>
          </TouchableOpacity>
        </Card>
      ))}
    </View>
  );
}

function PelletSizesSection() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["pellet-sizes"],
    queryFn: fetchPelletSizes,
  });
  const [label, setLabel] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createPelletSize(label.trim()),
    onSuccess: () => {
      setLabel("");
      queryClient.invalidateQueries({ queryKey: ["pellet-sizes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePelletSize(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pellet-sizes"] }),
  });

  const confirmDelete = (id: string, name: string) => {
    confirmAction(
      { title: "Remove pellet size?", message: `"${name}" will no longer be selectable for new feed purchases.`, confirmLabel: "Remove", destructive: true },
      () => deleteMutation.mutate(id)
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Pellet sizes</Text>
      <Text style={styles.hint}>The 1st column of the feed line-item table in New purchase.</Text>

      {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
      <View style={styles.addRow}>
        <FormField label="Pellet size" value={label} onChangeText={setLabel} placeholder="4mm" style={styles.addField} />
      </View>
      <PrimaryButton title="Add pellet size" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!label.trim()} style={styles.addButton} />

      {isPending && <LoadingView />}
      {isError && <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />}
      {data?.length === 0 && <EmptyState title="No pellet sizes yet" />}
      {data?.map((p) => (
        <Card key={p.id} style={styles.row}>
          <Text style={styles.rowLabel}>{p.label}</Text>
          <TouchableOpacity onPress={() => confirmDelete(p.id, p.label)}>
            <Text style={styles.removeLink}>Remove</Text>
          </TouchableOpacity>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ocean, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: 12, lineHeight: 17 },
  addRow: { marginBottom: 0 },
  addField: { marginBottom: 8 },
  addButton: { marginBottom: 16 },
  row: { marginHorizontal: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 14, fontWeight: "700", color: colors.ink },
  removeLink: { fontSize: 12, fontWeight: "700", color: colors.coral },
});
