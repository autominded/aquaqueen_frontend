import React from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

export function AdminUsersScreen() {
  const { user, impersonate } = useAuth();
  const navigation = useNavigation();
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
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
          .catch((err) => Alert.alert("Couldn't switch farms", apiErrorMessage(err)))
    );
  };

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={<EmptyState title="No users yet" />}
        renderItem={({ item }) => (
          <TouchableOpacity disabled={item.id === user?.id} onPress={() => confirmImpersonate(item)}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                {item.isSuperAdmin && <Text style={styles.badge}>Super admin</Text>}
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
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  listContent: { paddingTop: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: "#1c2424" },
  badge: { fontSize: 12, fontWeight: "700", color: "#0b6e6e" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
});
