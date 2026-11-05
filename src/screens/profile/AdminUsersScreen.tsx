import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { fetchAdminUsers, impersonateUser, lockAdminUser, removeAdminUser, resumeAdminUser } from "../../api/admin";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { AdminUser } from "../../api/types";
import { confirmAction } from "../../lib/confirm";
import { notify } from "../../lib/notify";
import { useRefreshing } from "../../lib/useRefreshing";
import { StatusPill } from "../../components/StatusPill";
import { colors, radii } from "../../theme";

export function AdminUsersScreen() {
  const { user, impersonate } = useAuth();
  const navigation = useNavigation();
  const { refreshing, onRefresh } = useRefreshing();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
  });

  const lockMutation = useMutation({
    mutationFn: (id: string) => lockAdminUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (err) => notify("Couldn't lock", apiErrorMessage(err)),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => resumeAdminUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (err) => notify("Couldn't resume", apiErrorMessage(err)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeAdminUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setExpandedId(null);
    },
    onError: (err) => notify("Couldn't remove", apiErrorMessage(err)),
  });

  const confirmImpersonate = (target: AdminUser) => {
    confirmAction(
      {
        title: `View ${target.organization.name}?`,
        message: `You'll act as ${target.name} (${target.role.name}) until you switch back.`,
        confirmLabel: "View",
      },
      () =>
        impersonate(target.id)
          .then(() => navigation.goBack())
          .catch((err) => notify("Couldn't switch farms", apiErrorMessage(err)))
    );
  };

  const confirmLock = (target: AdminUser) =>
    confirmAction(
      {
        title: `Lock ${target.name}?`,
        message: `They'll immediately lose access, including any active session — until you resume it. Their past activity stays on record.`,
        confirmLabel: "Lock",
        destructive: true,
      },
      () => lockMutation.mutate(target.id)
    );

  const confirmRemove = (target: AdminUser) =>
    confirmAction(
      {
        title: `Remove ${target.name}?`,
        message: `They'll disappear from every admin view and can no longer log in. Their historical data is kept, not deleted — but this can't be undone from here.`,
        confirmLabel: "Remove",
        destructive: true,
      },
      () => removeMutation.mutate(target.id)
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
        ListEmptyComponent={<EmptyState title="No users yet" />}
        renderItem={({ item }) => {
          const isSelf = item.id === user?.id;
          const expanded = expandedId === item.id;
          return (
            <Card>
              <TouchableOpacity disabled={isSelf} onPress={() => setExpandedId(expanded ? null : item.id)}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.pillRow}>
                    {item.deactivatedAt && <StatusPill label="Locked" tone="critical" />}
                    {item.organization.lockedAt && <StatusPill label="Org locked" tone="critical" />}
                    {item.isSuperAdmin && <StatusPill label="Super admin" tone="warning" />}
                  </View>
                </View>
                <Text style={styles.meta}>{item.email}</Text>
                <Text style={styles.meta}>{item.organization.name} · {item.role.name}</Text>
              </TouchableOpacity>

              {expanded && !isSelf && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.viewAsButton} onPress={() => confirmImpersonate(item)}>
                    <Text style={styles.viewAsButtonText}>View as {item.name}</Text>
                  </TouchableOpacity>

                  {item.deactivatedAt ? (
                    <TouchableOpacity style={styles.resumeButton} onPress={() => resumeMutation.mutate(item.id)}>
                      <Text style={styles.resumeButtonText}>Resume access</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.lockButton} onPress={() => confirmLock(item)}>
                      <Text style={styles.lockButtonText}>Lock account</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.removeButton} onPress={() => confirmRemove(item)}>
                    <Text style={styles.removeButtonText}>Remove account</Text>
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
  pillRow: { flexDirection: "row", gap: 6 },
  name: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  actions: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  viewAsButton: { paddingVertical: 10, alignItems: "center", backgroundColor: colors.surface, borderRadius: radii.sm, marginBottom: 6 },
  viewAsButtonText: { fontSize: 13, fontWeight: "800", color: colors.teal },
  lockButton: { paddingVertical: 10, alignItems: "center" },
  lockButtonText: { fontSize: 13, fontWeight: "800", color: colors.coral },
  resumeButton: { paddingVertical: 10, alignItems: "center" },
  resumeButtonText: { fontSize: 13, fontWeight: "800", color: colors.teal },
  removeButton: { paddingVertical: 10, alignItems: "center" },
  removeButtonText: { fontSize: 13, fontWeight: "800", color: colors.coral },
});
