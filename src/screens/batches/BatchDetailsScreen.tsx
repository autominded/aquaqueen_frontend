import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { fetchBatch, fetchFeedEntries, fetchMortalityEntries, fetchSamplingEntries, fetchWaterQualityReadings } from "../../api/batches";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<BatchesStackParamList, "BatchDetails">;

export function BatchDetailsScreen({ route, navigation }: Props) {
  const { batchId } = route.params;

  const batchQuery = useQuery({ queryKey: ["batch", batchId], queryFn: () => fetchBatch(batchId) });
  const feedQuery = useQuery({ queryKey: ["feed", batchId], queryFn: () => fetchFeedEntries(batchId) });
  const mortalityQuery = useQuery({ queryKey: ["mortality", batchId], queryFn: () => fetchMortalityEntries(batchId) });
  const samplingQuery = useQuery({ queryKey: ["sampling", batchId], queryFn: () => fetchSamplingEntries(batchId) });
  const waterQualityQuery = useQuery({ queryKey: ["water-quality", batchId], queryFn: () => fetchWaterQualityReadings(batchId) });

  if (batchQuery.isPending) return <LoadingView />;
  if (batchQuery.isError) return <ErrorBanner message={apiErrorMessage(batchQuery.error)} onRetry={batchQuery.refetch} />;

  const batch = batchQuery.data;
  const latestSampling = samplingQuery.data?.[0];
  const latestWaterQuality = waterQualityQuery.data?.[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>{batch.code}</Text>
          <Text style={styles.status}>{batch.status}</Text>
        </View>
        <Text style={styles.species}>{batch.species} · {batch.stage}</Text>
        <Text style={styles.meta}>{batch.location}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{batch.currentCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Current count</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{latestSampling ? `${latestSampling.avgWeightG}g` : "—"}</Text>
            <Text style={styles.statLabel}>Avg weight</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{latestWaterQuality ? `${latestWaterQuality.temperatureC}°C` : "—"}</Text>
            <Text style={styles.statLabel}>Water temp</Text>
          </View>
        </View>
      </Card>

      <View style={styles.actionsGrid}>
        <PrimaryButton title="Add feed" onPress={() => navigation.navigate("FeedEntry", { batchId })} style={styles.actionButton} />
        <PrimaryButton title="Add sampling" onPress={() => navigation.navigate("SamplingEntry", { batchId })} style={styles.actionButton} />
        <PrimaryButton title="Add mortality" onPress={() => navigation.navigate("MortalityEntry", { batchId })} style={styles.actionButton} />
        <PrimaryButton title="Water quality" onPress={() => navigation.navigate("WaterQualityEntry", { batchId })} style={styles.actionButton} />
      </View>
      <PrimaryButton
        title="Harvest planning"
        variant="secondary"
        onPress={() => navigation.navigate("HarvestPlanning", { batchId })}
        style={styles.harvestButton}
      />

      <Text style={styles.sectionTitle}>Recent feed entries</Text>
      {feedQuery.isPending && <LoadingView />}
      {feedQuery.data?.length === 0 && <EmptyState title="No feed entries yet" />}
      {feedQuery.data?.slice(0, 5).map((entry) => (
        <Card key={entry.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.entryTitle}>{entry.feedType}</Text>
            <Text style={styles.entryValue}>{entry.quantityKg} kg</Text>
          </View>
          <Text style={styles.meta}>{new Date(entry.date).toDateString()}</Text>
        </Card>
      ))}

      <Text style={styles.sectionTitle}>Recent mortality</Text>
      {mortalityQuery.isPending && <LoadingView />}
      {mortalityQuery.data?.length === 0 && <EmptyState title="No mortality logged" />}
      {mortalityQuery.data?.slice(0, 5).map((entry) => (
        <Card key={entry.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.entryTitle}>{entry.count} fish</Text>
            <Text style={styles.meta}>{new Date(entry.date).toDateString()}</Text>
          </View>
          {entry.cause && <Text style={styles.meta}>Cause: {entry.cause}</Text>}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  content: { paddingVertical: 16, paddingBottom: 40 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#1c2424" },
  status: { fontSize: 12, fontWeight: "700", color: "#0b6e6e" },
  species: { fontSize: 15, color: "#3f4a4a", marginTop: 2 },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 2 },
  statsRow: { flexDirection: "row", marginTop: 16, borderTopWidth: 1, borderTopColor: "#eef1f1", paddingTop: 12 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: "#1c2424" },
  statLabel: { fontSize: 11, color: "#7a8787", marginTop: 2 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, marginTop: 4 },
  actionButton: { width: "47%" },
  harvestButton: { marginHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1c2424", marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  entryTitle: { fontSize: 14, fontWeight: "600", color: "#1c2424" },
  entryValue: { fontSize: 14, fontWeight: "600", color: "#0b6e6e" },
});
