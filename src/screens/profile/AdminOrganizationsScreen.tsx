import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminOrganizations, lockOrganization, removeOrganization, resumeOrganization } from "../../api/admin";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { apiErrorMessage } from "../../api/client";
import { StatusPill } from "../../components/StatusPill";
import { confirmAction } from "../../lib/confirm";
import { notify } from "../../lib/notify";
import { useRefreshing } from "../../lib/useRefreshing";
import { colors } from "../../theme";
import { AdminOrganization } from "../../api/types";

export function AdminOrganizationsScreen() {
  const { refreshing, onRefresh } = useRefreshing();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: fetchAdminOrganizations,
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => lockOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
    onError: (err) => notify("Couldn't lock", apiErrorMessage(err)),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeOrganization(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-organizations"] }),
    onError: (err) => notify("Couldn't resume", apiErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeOrganization(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
      setExpandedId(null);
    },
    onError: (err) => notify("Couldn't remove", apiErrorMessage(err)),
  });

  const confirmLock = (org: AdminOrganization) =>
    confirmAction(
      {
        title: `Lock ${org.name}?`,
        message: `Every user at this farm (${org.userCount}) will immediately lose access, including anyone already logged in. Their data stays exactly as-is until you resume.`,
        confirmLabel: "Lock",
        destructive: true,
      },
      () => lockMutation.mutate(org.id)
    );

  const confirmRemove = (org: AdminOrganization) =>
    confirmAction(
      {
        title: `Remove ${org.name}?`,
        message: `This farm and its ${org.userCount} user(s) will disappear from every admin view and can no longer log in. Their historical data is kept, not deleted — but this can't be undone from here.`,
        confirmLabel: "Remove",
        destructive: true,
      },
      () => removeMutation.mutate(org.id)
    );

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
        ListEmptyComponent={<EmptyState title="No organizations yet" />}
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          return (
            <Card>
              <TouchableOpacity onPress={() => setExpandedId(expanded ? null : item.id)}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.lockedAt && <StatusPill label="Locked" tone="critical" />}
                </View>
                <Text style={styles.meta}>
                  {item.userCount} user{item.userCount === 1 ? "" : "s"}
                </Text>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.actions}>
                  {item.lockedAt ? (
                    <TouchableOpacity style={styles.resumeButton} onPress={() => resumeMutation.mutate(item.id)}>
                      <Text style={styles.resumeButtonText}>Resume access</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.lockButton} onPress={() => confirmLock(item)}>
                      <Text style={styles.lockButtonText}>Lock organization</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.removeButton} onPress={() => confirmRemove(item)}>
                    <Text style={styles.removeButtonText}>Remove organization</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  listContent: { paddingTop: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  actions: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  lockButton: { paddingVertical: 10, alignItems: "center" },
  lockButtonText: { fontSize: 13, fontWeight: "800", color: colors.coral },
  resumeButton: { paddingVertical: 10, alignItems: "center" },
  resumeButtonText: { fontSize: 13, fontWeight: "800", color: colors.teal },
  removeButton: { paddingVertical: 10, alignItems: "center" },
  removeButtonText: { fontSize: 13, fontWeight: "800", color: colors.coral },
});
