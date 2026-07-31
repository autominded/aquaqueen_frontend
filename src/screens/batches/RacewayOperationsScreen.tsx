import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { AppTabParamList, BatchesStackParamList } from "../../navigation/types";
import { fetchRacewayOperations } from "../../api/batches";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AppIcon } from "../../components/AppIcon";
import { apiErrorMessage } from "../../api/client";
import { colors, radii } from "../../theme";
import { useUnits } from "../../context/UnitsContext";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<BatchesStackParamList, "RacewayOperations">;

const STAGE_LABEL: Record<string, string> = { FINGERLING: "Fingerling", JUVENILE: "Juvenile", ADULT: "Adult", BROODER: "Brooder" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function RacewayOperationsScreen({ route, navigation }: Props) {
  const { racewayId } = route.params;
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const { formatLength, formatWeight, formatMass } = useUnits();
  const opsQuery = useQuery({ queryKey: ["raceway-operations", racewayId], queryFn: () => fetchRacewayOperations(racewayId) });
  const { refreshing, onRefresh } = useRefreshing();

  if (opsQuery.isPending) return <LoadingView />;
  if (opsQuery.isError) return <ErrorBanner message={apiErrorMessage(opsQuery.error)} onRetry={opsQuery.refetch} />;

  const { raceway, stockings, latestSampling, latestWaterQuality } = opsQuery.data;

  return (
    <RefreshableScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <TouchableOpacity
          onPress={() => tabNavigation.navigate("Profile", { screen: "FarmSetup" })}
          accessibilityLabel="Edit raceway in farm setup"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.editIcon}
        >
          <AppIcon name="edit" size={18} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.eyebrow}>RACEWAY</Text>
        <Text style={styles.title}>{raceway.name}</Text>
        <Text style={styles.dims}>
          {formatLength(raceway.lengthM)} × {formatLength(raceway.widthM)} · {formatLength(raceway.depthM)} deep
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stockings.reduce((sum, s) => sum + s.currentCount, 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Fish here</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{latestSampling ? formatWeight(latestSampling.avgWeightG) : "—"}</Text>
            <Text style={styles.statLabel}>Avg weight</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{latestWaterQuality ? `${latestWaterQuality.temperatureC}°C` : "—"}</Text>
            <Text style={styles.statLabel}>Water temp</Text>
          </View>
        </View>
      </View>

      {stockings.length === 0 && (
        <>
          <EmptyState
            title="No batch stocked here yet"
            subtitle="Assign this raceway to a batch's fish count when you create a new batch."
          />
          <PrimaryButton title="Create a batch" onPress={() => navigation.navigate("NewBatch")} style={styles.harvestButton} />
        </>
      )}

      {stockings.length > 0 && (
        <PrimaryButton
          title="Plan harvest"
          variant="secondary"
          onPress={() => tabNavigation.navigate("Sales", { screen: "POS", params: { racewayId } })}
          style={styles.harvestButton}
        />
      )}

      {stockings.map((stocking) => (
        <Card key={stocking.id} style={styles.batchCard}>
          <TouchableOpacity onPress={() => navigation.navigate("BatchDetails", { batchId: stocking.batch.id })}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.runningLabel}>Running</Text>
                <Text style={styles.batchCode}>{stocking.batch.code}</Text>
                <Text style={styles.batchMeta}>
                  {stocking.batch.species} · {STAGE_LABEL[stocking.batch.stage] ?? stocking.batch.stage}
                </Text>
              </View>
              <View style={styles.batchCountWrap}>
                <Text style={styles.batchCount}>{stocking.currentCount.toLocaleString()}</Text>
                <Text style={styles.batchCountLabel}>fish here</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.growthPanel}>
            <Text style={styles.growthMeta}>Stocked {stocking.initialCount.toLocaleString()} fish on {formatDate(stocking.createdAt)}</Text>

            <View style={styles.growthRow}>
              <View style={styles.growthCol}>
                <Text style={styles.growthLabel}>Biomass (from feeding)</Text>
                <Text style={styles.growthValue}>{formatMass(stocking.biomassFromFeedKg)}</Text>
                <Text style={styles.growthSub}>Assumes {stocking.assumedFcr} FCR · {formatMass(stocking.totalFeedKg)} fed</Text>
              </View>
              <View style={styles.growthCol}>
                <Text style={styles.growthLabel}>Biomass (from sampling)</Text>
                <Text style={styles.growthValue}>
                  {stocking.biomassFromSamplingKg != null ? formatMass(stocking.biomassFromSamplingKg) : "—"}
                </Text>
                <Text style={styles.growthSub}>
                  FCR {stocking.fcrFromSampling != null ? stocking.fcrFromSampling.toFixed(2) : "— (needs 2+ sampling rounds)"}
                </Text>
              </View>
            </View>

            <View style={styles.predictionRow}>
              <AppIcon name="trending-up" size={16} color={colors.tealDark} />
              <Text style={styles.predictionText}>
                {stocking.prediction?.status === "salable" && "Already at salable size (200g+)"}
                {stocking.prediction?.status === "projecting" &&
                  `Est. salable size around ${formatDate(stocking.prediction.estimatedDate!)} (~${stocking.prediction.daysRemaining}d)`}
                {(stocking.prediction?.status === "insufficient_data" || !stocking.prediction) &&
                  "Not enough sampling history yet to predict a salable date"}
              </Text>
            </View>
          </View>

          <Text style={styles.actionHeading}>Log activity</Text>
          <View style={styles.actionsGrid}>
            <PrimaryButton
              title="Add feed"
              onPress={() => navigation.navigate("FeedEntry", { batchId: stocking.batch.id, racewayId })}
              style={styles.actionButton}
            />
            <PrimaryButton
              title="Add sampling"
              onPress={() => navigation.navigate("SamplingEntry", { batchId: stocking.batch.id, racewayId })}
              style={styles.actionButton}
            />
            <PrimaryButton
              title="Add mortality"
              onPress={() => navigation.navigate("MortalityEntry", { batchId: stocking.batch.id, racewayId })}
              style={styles.actionButton}
            />
            <PrimaryButton
              title="Water quality"
              onPress={() => navigation.navigate("WaterQualityEntry", { batchId: stocking.batch.id, racewayId })}
              style={styles.actionButton}
            />
          </View>
        </Card>
      ))}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 16, paddingBottom: 40 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  hero: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20, position: "relative" },
  editIcon: { position: "absolute", top: 16, right: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 11, fontWeight: "800", color: "#BBD9D5", letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: "800", color: colors.white, marginTop: 4 },
  dims: { fontSize: 13, color: "#D5E8E5", marginTop: 6 },
  statsRow: { flexDirection: "row", marginTop: 18, borderTopWidth: 1, borderTopColor: "#2C5966", paddingTop: 14 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "800", color: colors.white },
  statLabel: { fontSize: 11, color: "#BBD9D5", marginTop: 3 },
  harvestButton: { marginTop: 16 },
  batchCard: { marginHorizontal: 0, marginTop: 16 },
  runningLabel: { fontSize: 11, fontWeight: "800", color: colors.teal, letterSpacing: 0.5 },
  batchCode: { fontSize: 18, fontWeight: "800", color: colors.ink, marginTop: 2 },
  batchMeta: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  batchCountWrap: { alignItems: "flex-end" },
  batchCount: { fontSize: 18, fontWeight: "800", color: colors.tealDark },
  batchCountLabel: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  actionHeading: { fontSize: 14, fontWeight: "800", color: colors.ocean, marginTop: 18, marginBottom: 10 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { width: "47%" },
  growthPanel: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  growthMeta: { fontSize: 12, color: colors.inkMuted, marginBottom: 12 },
  growthRow: { flexDirection: "row", gap: 12 },
  growthCol: { flex: 1 },
  growthLabel: { fontSize: 11, fontWeight: "700", color: colors.inkMuted },
  growthValue: { fontSize: 16, fontWeight: "800", color: colors.ink, marginTop: 3 },
  growthSub: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  predictionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, backgroundColor: colors.tealSoft, borderRadius: radii.sm, padding: 10 },
  predictionText: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.tealDark, lineHeight: 16 },
});
