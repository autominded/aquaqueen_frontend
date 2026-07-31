import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { fetchAdminUsers } from "../../api/admin";
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
import { colors } from "../../theme";

export function AdminUsersScreen() {
  const { user, impersonate } = useAuth();
  const navigation = useNavigation();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAdminUsers,
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
        renderItem={({ item }) => (
          <TouchableOpacity disabled={item.id === user?.id} onPress={() => confirmImpersonate(item)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                {item.isSuperAdmin && <StatusPill label="Super admin" tone="warning" />}
              </View>
              <Text style={styles.meta}>{item.email}</Text>
              <Text style={styles.meta}>{item.organization.name} · {item.role.name}</Text>
            </Card>
          </TouchableOpacity>
        )}
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
});
