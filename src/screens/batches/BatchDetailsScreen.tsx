import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { AppTabParamList, BatchesStackParamList } from "../../navigation/types";
import { deleteBatch, fetchBatch, fetchFeedEntries, fetchMortalityEntries, fetchSamplingEntries, fetchWaterQualityReadings } from "../../api/batches";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { AppIcon } from "../../components/AppIcon";
import { StatusPill } from "../../components/StatusPill";
import { useAuth } from "../../context/AuthContext";
import { confirmAction } from "../../lib/confirm";
import { notify } from "../../lib/notify";
import { colors, radii } from "../../theme";
import { useUnits } from "../../context/UnitsContext";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<BatchesStackParamList, "BatchDetails">;

export function BatchDetailsScreen({ route, navigation }: Props) {
  const { batchId } = route.params;
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { formatMass, formatWeight } = useUnits();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("batches.manage");
  const queryClient = useQueryClient();

  const batchQuery = useQuery({ queryKey: ["batch", batchId], queryFn: () => fetchBatch(batchId) });
  const feedQuery = useQuery({ queryKey: ["feed", batchId], queryFn: () => fetchFeedEntries(batchId) });
  const mortalityQuery = useQuery({ queryKey: ["mortality", batchId], queryFn: () => fetchMortalityEntries(batchId) });
  const samplingQuery = useQuery({ queryKey: ["sampling", batchId], queryFn: () => fetchSamplingEntries(batchId) });
  const waterQualityQuery = useQuery({ queryKey: ["water-quality", batchId], queryFn: () => fetchWaterQualityReadings(batchId) });
  const { refreshing, onRefresh } = useRefreshing();

  const deleteMutation = useMutation({
    mutationFn: () => deleteBatch(batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      navigation.goBack();
    },
    onError: (err) => notify("Couldn't delete batch", apiErrorMessage(err)),
  });

  if (batchQuery.isPending) return <LoadingView />;
  if (batchQuery.isError) return <ErrorBanner message={apiErrorMessage(batchQuery.error)} onRetry={batchQuery.refetch} />;

  const batch = batchQuery.data;
  const latestSampling = samplingQuery.data?.[0];
  const latestWaterQuality = waterQualityQuery.data?.[0];

  const confirmDelete = () => {
    confirmAction(
      {
        title: "Delete batch?",
        message: `${batch.code}'s feed, sampling, mortality, and water-quality history stays on record, but the batch itself won't show up anywhere active. This can't be undone from the app.`,
        confirmLabel: "Delete",
        destructive: true,
      },
      () => deleteMutation.mutate()
    );
  };

  return (
    <RefreshableScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <View style={styles.rowBetween}>
          <View><Text style={styles.eyebrow}>BATCH</Text><Text style={styles.title}>{batch.code}</Text></View>
          <View style={styles.heroActions}>
            {canManage && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate("EditBatch", { batchId })}
                accessibilityLabel="Edit batch"
              >
                <AppIcon name="edit-2" size={15} color={colors.white} />
              </TouchableOpacity>
            )}
            <StatusPill label={batch.status} tone={batch.status === "ACTIVE" ? "success" : "neutral"} />
          </View>
        </View>
        <Text style={styles.species}>{batch.species} · {batch.stage}</Text>
        {batch.stockings.length === 0 ? (
          <View style={styles.location}><AppIcon name="map-pin" size={15} color="#BBD9D5" /><Text style={styles.heroMeta}>{batch.location}</Text></View>
        ) : (
          <View style={styles.racewayChipRow}>
            {batch.stockings.map((stocking) => (
              <TouchableOpacity
                key={stocking.id}
                style={styles.racewayChip}
                onPress={() => navigation.navigate("RacewayOperations", { racewayId: stocking.racewayId })}
              >
                <AppIcon name="map-pin" size={13} color="#BBD9D5" />
                <Text style={styles.racewayChipText}>
                  {stocking.raceway.name} · {stocking.currentCount.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{batch.currentCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Current count</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{latestSampling ? formatWeight(latestSampling.avgWeightG) : "—"}</Text>
            <Text style={styles.statLabel}>Avg weight</Text>
          </View>
          <View style={styles.stat}>
            {/* Guards the field, not just the row: a reading rolled up from a
                device that has no temperature probe fitted has a null here,
                and interpolating it would render "null°C". */}
            <Text style={styles.statValue}>
              {typeof latestWaterQuality?.temperatureC === "number" ? `${latestWaterQuality.temperatureC}°C` : "—"}
            </Text>
            <Text style={styles.statLabel}>Water temp</Text>
          </View>
        </View>
      </View>

      <Text style={styles.actionHeading}>Log activity</Text>
      <View style={styles.actionsGrid}>
        <PrimaryButton title="Add feed" onPress={() => navigation.navigate("FeedEntry", { batchId })} style={styles.actionButton} />
        <PrimaryButton title="Add sampling" onPress={() => navigation.navigate("SamplingEntry", { batchId })} style={styles.actionButton} />
        <PrimaryButton title="Add mortality" onPress={() => navigation.navigate("MortalityEntry", { batchId })} style={styles.actionButton} />
        <PrimaryButton title="Water quality" onPress={() => navigation.navigate("WaterQualityEntry", { batchId })} style={styles.actionButton} />
      </View>
      <PrimaryButton
        title="Plan harvest"
        variant="secondary"
        onPress={() => tabNavigation.navigate("Sales", { screen: "POS", params: { batchId } })}
        style={styles.harvestButton}
      />
      {canManage && (
        <TouchableOpacity onPress={confirmDelete} style={styles.deleteButton}>
          <Text style={styles.deleteButtonText}>Delete batch</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Recent feed entries</Text>
      {feedQuery.isPending && <LoadingView />}
      {feedQuery.data?.length === 0 && <EmptyState title="No feed entries yet" />}
      {feedQuery.data?.slice(0, 5).map((entry) => (
        <Card key={entry.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.entryTitle}>{entry.feedType}</Text>
            <Text style={styles.entryValue}>{formatMass(entry.quantityKg)}</Text>
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
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 40 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hero: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20 },
  eyebrow: { fontSize: 11, fontWeight: "800", color: "#BBD9D5", letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: "800", color: colors.white, marginTop: 4 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  editButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  species: { fontSize: 15, color: "#D5E8E5", marginTop: 10 }, location: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }, heroMeta: { fontSize: 13, color: "#BBD9D5" },
  racewayChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  racewayChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5 },
  racewayChipText: { fontSize: 12, fontWeight: "700", color: "#D5E8E5" },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  statsRow: { flexDirection: "row", marginTop: 18, borderTopWidth: 1, borderTopColor: "#2C5966", paddingTop: 14 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "800", color: colors.white },
  statLabel: { fontSize: 11, color: "#BBD9D5", marginTop: 3 },
  actionHeading: { fontSize: 16, fontWeight: "800", color: colors.ocean, marginTop: 24, marginBottom: 10 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { width: "47%" },
  harvestButton: { marginTop: 8 },
  deleteButton: { marginTop: 14, alignItems: "center" },
  deleteButtonText: { fontSize: 13, fontWeight: "700", color: colors.coral },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ocean, marginTop: 26, marginBottom: 8 },
  entryTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  entryValue: { fontSize: 14, fontWeight: "800", color: colors.teal },
});
