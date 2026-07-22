import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { fetchBatches } from "../../api/batches";
import { Batch } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

type Props = NativeStackScreenProps<BatchesStackParamList, "BatchList">;

const STAGE_LABEL: Record<Batch["stage"], string> = {
  FRY: "Fry",
  FINGERLING: "Fingerling",
  JUVENILE: "Juvenile",
  ADULT: "Adult",
};

export function BatchListScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      {hasPermission("batches.manage") && (
        <View style={styles.header}>
          <PrimaryButton title="+ New batch" onPress={() => navigation.navigate("NewBatch")} />
        </View>
      )}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <EmptyState title="No batches yet" subtitle="Create your first batch to start tracking production." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("BatchDetails", { batchId: item.id })}>
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <Text style={styles.species}>{item.species}</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.meta}>{STAGE_LABEL[item.stage]} · {item.location}</Text>
                <Text style={styles.meta}>{item.currentCount.toLocaleString()} fish</Text>
              </View>
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
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  code: { fontSize: 17, fontWeight: "700", color: "#1c2424" },
  status: { fontSize: 12, fontWeight: "700", color: "#0b6e6e" },
  species: { fontSize: 14, color: "#3f4a4a", marginTop: 2, marginBottom: 8 },
  meta: { fontSize: 13, color: "#7a8787" },
});
