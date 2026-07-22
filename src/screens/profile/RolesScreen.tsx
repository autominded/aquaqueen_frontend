import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { fetchRoles } from "../../api/roles";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<ProfileStackParamList, "Roles">;

export function RolesScreen({ navigation }: Props) {
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PrimaryButton title="+ New role" onPress={() => navigation.navigate("RoleForm", {})} />
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <TouchableOpacity
            disabled={item.isSystem}
            onPress={() => navigation.navigate("RoleForm", { roleId: item.id })}
          >
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                {item.isSystem && <Text style={styles.protected}>Protected</Text>}
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
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  header: { padding: 16, paddingBottom: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: "#1c2424" },
  protected: { fontSize: 12, fontWeight: "700", color: "#7a8787" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
});
