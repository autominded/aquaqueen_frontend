import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { fetchRoles } from "../../api/roles";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Card } from "../../components/Card";
import { apiErrorMessage } from "../../api/client";
import { StatusPill } from "../../components/StatusPill";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<ProfileStackParamList, "Roles">;

export function RolesScreen({ navigation }: Props) {
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>ACCESS</Text><Text style={styles.heading}>Roles</Text></View>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("RoleForm", {})} accessibilityLabel="Create a new role">
          <Text style={styles.addButtonText}>New role</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <TouchableOpacity
            disabled={item.isSystem}
            onPress={() => navigation.navigate("RoleForm", { roleId: item.id })}
          >
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                {item.isSystem && <StatusPill label="Protected" tone="neutral" />}
              </View>
              <Text style={styles.meta}>
                {item.permissions.length} permission{item.permissions.length === 1 ? "" : "s"}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.teal },
  heading: { color: colors.ocean, fontSize: 26, fontWeight: "800", marginTop: 3 },
  addButton: { backgroundColor: colors.teal, minHeight: 40, paddingHorizontal: 13, borderRadius: radii.sm, justifyContent: "center", alignItems: "center" },
  addButtonText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
});
