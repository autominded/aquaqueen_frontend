import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTray, deleteTray, fetchTrays, updateTray } from "../../api/trays";
import { Tray } from "../../api/types";
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

export function TraysScreen() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["trays"], queryFn: fetchTrays });
  const { refreshing, onRefresh } = useRefreshing();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const createMutation = useMutation({
    mutationFn: () => createTray(name.trim()),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["trays"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateTray(editingId!, editingName.trim()),
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["trays"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTray(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trays"] }),
  });

  const startEditing = (tray: Tray) => {
    setEditingId(tray.id);
    setEditingName(tray.name);
  };

  const confirmDelete = (id: string, label: string) => {
    confirmAction(
      { title: "Remove tray?", message: `"${label}" will no longer be selectable for hatchery batches.`, confirmLabel: "Remove", destructive: true },
      () => deleteMutation.mutate(id)
    );
  };

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={styles.sectionTitle}>Trays</Text>
      <Text style={styles.hint}>Incubation trays you assign egg batches to.</Text>

      {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
      <FormField label="Tray name" value={name} onChangeText={setName} placeholder="Tray A1" style={styles.addField} />
      <PrimaryButton title="Add tray" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!name.trim()} style={styles.addButton} />

      {isPending && <LoadingView />}
      {isError && <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />}
      {data?.length === 0 && <EmptyState title="No trays yet" />}
      {updateMutation.isError && <ErrorBanner message={apiErrorMessage(updateMutation.error)} />}

      {data?.map((tray) =>
        editingId === tray.id ? (
          <Card key={tray.id} style={styles.editCard}>
            <FormField label="Tray name" value={editingName} onChangeText={setEditingName} />
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
          <Card key={tray.id} style={styles.row}>
            <Text style={styles.rowLabel}>{tray.name}</Text>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => startEditing(tray)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(tray.id, tray.name)}>
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
