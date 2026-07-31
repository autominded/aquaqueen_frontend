import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createSpecies, deleteSpecies, fetchSpecies, updateSpecies } from "../../api/species";
import { Species } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { confirmAction } from "../../lib/confirm";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { colors } from "../../theme";

// Platform-wide species catalog every farm's New Batch dropdown reads from —
// gated to super admins only via the ProfileScreen menu entry that routes
// here, same trust boundary as FeedCatalogScreen.
export function SpeciesScreen() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["species"], queryFn: fetchSpecies });
  const { refreshing, onRefresh } = useRefreshing();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createSpecies(name.trim()),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["species"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateSpecies(editingId!, editingName.trim()),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["species"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSpecies(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["species"] }),
  });

  const startEditing = (species: Species) => {
    setEditingId(species.id);
    setEditingName(species.name);
  };

  const confirmDelete = (id: string, label: string) => {
    confirmAction(
      { title: "Remove species?", message: `"${label}" will no longer be selectable for new batches.`, confirmLabel: "Remove", destructive: true },
      () => deleteMutation.mutate(id)
    );
  };

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={styles.sectionTitle}>Species</Text>
      <Text style={styles.hint}>Shown as a dropdown when creating or editing a batch.</Text>

      {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
      <FormField label="Species name" value={name} onChangeText={setName} placeholder="Rainbow Trout" style={styles.addField} />
      <PrimaryButton title="Add species" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!name.trim()} style={styles.addButton} />

      {isPending && <LoadingView />}
      {isError && <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />}
      {data?.length === 0 && <EmptyState title="No species yet" />}
      {updateMutation.isError && <ErrorBanner message={apiErrorMessage(updateMutation.error)} />}

      {data?.map((s) =>
        editingId === s.id ? (
          <Card key={s.id} style={styles.editCard}>
            <FormField label="Species name" value={editingName} onChangeText={setEditingName} />
            <View style={styles.editActions}>
              <PrimaryButton title="Cancel" variant="secondary" onPress={() => setEditingId(null)} style={styles.editButton} />
              <PrimaryButton
                title="Save"
                onPress={() => updateMutation.mutate()}
                loading={updateMutation.isPending}
                disabled={!editingName.trim()}
                style={styles.editButton}
              />
            </View>
          </Card>
        ) : (
          <Card key={s.id} style={styles.row}>
            <Text style={styles.rowLabel}>{s.name}</Text>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => startEditing(s)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(s.id, s.name)}>
                <Text style={styles.removeLink}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )
      )}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ocean, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: 12, lineHeight: 17 },
  addField: { marginBottom: 8 },
  addButton: { marginBottom: 16 },
  row: { marginHorizontal: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: 14, fontWeight: "700", color: colors.ink },
  rowActions: { flexDirection: "row", gap: 16 },
  editLink: { fontSize: 12, fontWeight: "700", color: colors.teal },
  removeLink: { fontSize: 12, fontWeight: "700", color: colors.coral },
  editCard: { marginHorizontal: 0 },
  editActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  editButton: { flex: 1 },
});
