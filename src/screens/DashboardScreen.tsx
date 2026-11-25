import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppTabParamList } from "../navigation/types";
import { fetchDashboardSummary, fetchDashboardAlerts, fetchDashboardRaceways, fetchDashboardFarmStatus, fetchDashboardFinanceGlance } from "../api/dashboard";
import { fetchIndustryPosts } from "../api/industryPosts";
import { fetchLedger } from "../api/accounts";
import { fetchFarm } from "../api/farm";
import { API_ORIGIN } from "../config";
import { LoadingView } from "../components/LoadingView";
import { ErrorBanner } from "../components/ErrorBanner";
import { Card } from "../components/Card";
import { AppIcon } from "../components/AppIcon";
import { StatusPill } from "../components/StatusPill";
import { RacewayCard } from "../components/RacewayCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { AdvisoryBanner } from "../components/AdvisoryBanner";
import { RefreshableScrollView } from "../components/RefreshableScrollView";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radii } from "../theme";
import { useUnits } from "../context/UnitsContext";
import { useRefreshing } from "../lib/useRefreshing";

type Props = BottomTabScreenProps<AppTabParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  const { user, justSignedUp, dismissWelcome, hasPermission } = useAuth();
  const { formatMass } = useUnits();
  const summaryQuery = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary });
  const racewaysQuery = useQuery({ queryKey: ["dashboard-raceways"], queryFn: fetchDashboardRaceways });
  const alertsQuery = useQuery({ queryKey: ["dashboard-alerts"], queryFn: fetchDashboardAlerts });
  const farmStatusQuery = useQuery({ queryKey: ["dashboard-farm-status"], queryFn: fetchDashboardFarmStatus });
  const financeGlanceQuery = useQuery({ queryKey: ["dashboard-finance-glance"], queryFn: fetchDashboardFinanceGlance });
  const industryPostsQuery = useQuery({ queryKey: ["industry-posts"], queryFn: fetchIndustryPosts });
  const latestPost = industryPostsQuery.data?.[0];
  const ledgerQuery = useQuery({ queryKey: ["ledger"], queryFn: fetchLedger });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });
  const totalBalance = ledgerQuery.data?.accounts.reduce((sum, account) => sum + account.balance, 0) ?? null;
  const alerts = alertsQuery.data ?? [];
  // farmQuery.data is undefined while loading, null once loaded with no Farm
  // row for this org yet — only the latter should trigger the notice.
  const needsFarmSetup = farmQuery.data === null;
  const canManageFarm = hasPermission("farm.manage");
  const { refreshing, onRefresh } = useRefreshing();

  return (
    <RefreshableScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.header}>
        {farmQuery.data?.logoUrl ? (
          <View style={styles.farmLogoFrame}>
            <Image source={{ uri: `${API_ORIGIN}${farmQuery.data.logoUrl}` }} style={styles.farmLogo} resizeMode="contain" />
          </View>
        ) : (
          <View style={styles.farmLogoPlaceholder}><AppIcon name="anchor" size={36} color={colors.teal} /></View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>Welcome, {user?.name.split(" ")[0]}</Text>
          <Text style={styles.farmName}>{user?.organizationName ?? "Your farm"}</Text>
          {farmQuery.data?.address && (
            <Text style={styles.farmAddress} numberOfLines={2}>{farmQuery.data.address}</Text>
          )}
        </View>
      </View>

      <AdvisoryBanner />

      {needsFarmSetup && (
        <View style={styles.welcomeCard}>
          <AppIcon name="map" size={26} color="#D5E8E5" />
          <Text style={styles.welcomeTitle}>{justSignedUp ? "Welcome to FarmFin!" : "Set up your farm"}</Text>
          <Text style={styles.welcomeText}>
            {canManageFarm
              ? "Add your raceways, location and photo to unlock production tracking, batches and harvest planning."
              : "Your farm hasn't been set up yet — ask an owner or manager to complete farm setup to unlock production tracking."}
          </Text>
          {canManageFarm && (
            <PrimaryButton
              title="Set up my farm now"
              onPress={() => {
                dismissWelcome();
                navigation.navigate("Profile", { screen: "FarmSetup" });
              }}
              style={styles.welcomeButton}
            />
          )}
        </View>
      )}

      {summaryQuery.isPending && <LoadingView />}
      {summaryQuery.isError && <ErrorBanner message={apiErrorMessage(summaryQuery.error)} onRetry={summaryQuery.refetch} />}
      {summaryQuery.data && (
        <>
          <TouchableOpacity onPress={() => navigation.navigate("Batches", { screen: "OperationsHome" })}>
            <View style={styles.healthCard}>
              <View style={styles.healthCopy}>
                <Text style={styles.healthTitle}>{alerts.length ? "Your Farm Needs Attention" : "Your Farm is Looking Healthy"}</Text>
                <Text style={styles.healthSubtitle}>
                  {alerts.length ? `${alerts.length} item${alerts.length === 1 ? "" : "s"} to review today` : "All tracked batches are up to date"}
                </Text>
              </View>
              <StatusPill label={alerts.length ? "REVIEW" : "ON TRACK"} tone={alerts.length ? "warning" : "success"} />
            </View>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>At a glance</Text>
          <View style={styles.metricsGrid}>
            <Metric icon="layers" value={summaryQuery.data.totalActiveBatches.toString()} label="Active batches" />
            <Metric icon="activity" value={summaryQuery.data.totalFishCount.toLocaleString()} label="Fish on farm" />
            <Metric icon="anchor" value={formatMass(summaryQuery.data.estimatedBiomassKg)} label="Est. biomass" />
            <Metric icon="package" value={formatMass(summaryQuery.data.feedGivenLast7dKg)} label="Feed · 7 days" />
          </View>

          <Text style={styles.sectionTitle}>Raceways</Text>
          {racewaysQuery.isPending && <LoadingView />}
          {racewaysQuery.isError && <ErrorBanner message={apiErrorMessage(racewaysQuery.error)} onRetry={racewaysQuery.refetch} />}
          {racewaysQuery.data?.length === 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("Profile", { screen: "FarmSetup" })}>
              <Card style={styles.racewayEmptyCard}>
                <AppIcon name="grid" size={18} color={colors.teal} />
                <View style={styles.racewayEmptyCopy}>
                  <Text style={styles.racewayEmptyTitle}>No raceways set up yet</Text>
                  <Text style={styles.racewayEmptyHint}>Add them in Farm setup to see them here</Text>
                </View>
                <AppIcon name="chevron-right" />
              </Card>
            </TouchableOpacity>
          )}
          {racewaysQuery.data && racewaysQuery.data.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.racewayRow}>
              {racewaysQuery.data.map((raceway) => (
                <TouchableOpacity
                  key={raceway.id}
                  onPress={() => navigation.navigate("Batches", { screen: "RacewayOperations", params: { racewayId: raceway.id } })}
                >
                  <RacewayCard raceway={raceway} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.todayCard}>
            <View style={styles.todayHeading}><Text style={styles.todayTitle}>Today’s watchlist</Text><AppIcon name="calendar" size={18} color={colors.teal} /></View>
            <MetricRow icon="droplet" label="Water-quality checks" value="Keep every active batch current" />
            <MetricRow icon="heart" label="Mortality · 7 days" value={`${summaryQuery.data.mortalityLast7d} recorded`} last />
          </View>

          <Text style={styles.sectionTitle}>Farm status</Text>
          {farmStatusQuery.isPending && <LoadingView />}
          {farmStatusQuery.isError && <ErrorBanner message={apiErrorMessage(farmStatusQuery.error)} onRetry={farmStatusQuery.refetch} />}
          {farmStatusQuery.data && (
            <View style={styles.metricsGrid}>
              <Metric icon="feather" value={farmStatusQuery.data.activeBroodstock.toString()} label="Active broodstock" />
              <Metric icon="clock" value={farmStatusQuery.data.hatcheryBatchesInProgress.toString()} label="Hatchery batches" />
              <Metric
                icon="trending-up"
                value={farmStatusQuery.data.fryConversionPct != null ? `${farmStatusQuery.data.fryConversionPct}%` : "—"}
                label="Egg→fry conversion"
              />
              <Metric icon="users" value={farmStatusQuery.data.activeEmployees.toString()} label="Active employees" />
              <Metric icon="calendar" value={farmStatusQuery.data.employeesOnLeaveToday.toString()} label="On leave today" />
            </View>
          )}

          <Text style={styles.sectionTitle}>Farm at a glance</Text>
          {financeGlanceQuery.isPending && <LoadingView />}
          {financeGlanceQuery.isError && <ErrorBanner message={apiErrorMessage(financeGlanceQuery.error)} onRetry={financeGlanceQuery.refetch} />}
          {financeGlanceQuery.data && (
            <View style={styles.metricsGrid}>
              <Metric icon="arrow-down-circle" value={`₹${financeGlanceQuery.data.totalReceivable.toFixed(2)}`} label="Receivable" />
              <Metric icon="arrow-up-circle" value={`₹${financeGlanceQuery.data.totalPayable.toFixed(2)}`} label="Payable" />
              <Metric icon="alert-circle" value={financeGlanceQuery.data.feedAlertsCount.toString()} label="Feed stock alerts" />
              <Metric icon="box" value={financeGlanceQuery.data.farmInventoryItemCount.toString()} label="Inventory items" />
            </View>
          )}

          <TouchableOpacity onPress={() => navigation.navigate("Purchases", { screen: "Ledger" })}>
            <Card style={styles.ledgerCard}>
              <View style={styles.ledgerIcon}><AppIcon name="dollar-sign" size={18} color={colors.teal} /></View>
              <View style={styles.ledgerCopy}>
                <Text style={styles.ledgerLabel}>Cash & bank balance</Text>
                <Text style={styles.ledgerValue}>
                  {ledgerQuery.isPending ? "…" : totalBalance != null ? `₹${totalBalance.toFixed(2)}` : "—"}
                </Text>
                <Text style={styles.ledgerHint}>View full ledger</Text>
              </View>
              <AppIcon name="chevron-right" />
            </Card>
          </TouchableOpacity>
        </>
      )}

      {latestPost && (
        <TouchableOpacity onPress={() => navigation.navigate("Profile", { screen: "IndustryUpdates" })}>
          <Card style={styles.industryCard}>
            <View style={styles.industryHeading}>
              <AppIcon name="rss" size={16} color={colors.teal} />
              <Text style={styles.industryLabel}>Industry updates</Text>
            </View>
            <Text style={styles.industryTitle}>{latestPost.title}</Text>
            <Text style={styles.industryHint}>See all updates</Text>
          </Card>
        </TouchableOpacity>
      )}
    </RefreshableScrollView>
  );
}

function Metric({ icon, value, label }: { icon: React.ComponentProps<typeof AppIcon>["name"]; value: string; label: string }) {
  return <View style={styles.metric}><View style={styles.metricIcon}><AppIcon name={icon} size={18} color={colors.teal} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}
function MetricRow({ icon, label, value, last = false }: { icon: React.ComponentProps<typeof AppIcon>["name"]; label: string; value: string; last?: boolean }) {
  return <View style={[styles.metricRow, last && styles.metricRowLast]}><View style={styles.rowIcon}><AppIcon name={icon} size={17} color={colors.teal} /></View><View><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8, marginBottom: 24 }, headerCopy: { flex: 1 },
  greeting: { color: colors.ocean, fontSize: 28, fontWeight: "800", letterSpacing: -0.7, marginTop: 5 }, farmName: { color: colors.inkMuted, fontSize: 14, marginTop: 4 },
  farmAddress: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  farmLogoFrame: { width: 92, height: 92, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", padding: 8 },
  farmLogo: { width: "100%", height: "100%" },
  farmLogoPlaceholder: { width: 92, height: 92, borderRadius: 18, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  healthCard: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20, flexDirection: "row", justifyContent: "space-between", gap: 12 }, healthCopy: { flex: 1 }, healthTitle: { color: colors.white, fontWeight: "800", fontSize: 21 }, healthSubtitle: { color: "#D5E8E5", fontSize: 13, marginTop: 5, maxWidth: 220 },
  welcomeCard: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20, marginBottom: 20 },
  welcomeTitle: { color: colors.white, fontWeight: "800", fontSize: 20, marginTop: 10 },
  welcomeText: { color: "#D5E8E5", fontSize: 13, lineHeight: 18, marginTop: 6 },
  welcomeButton: { width: "100%", marginTop: 16 },
  sectionTitle: { color: colors.ocean, fontSize: 18, fontWeight: "800", marginTop: 28, marginBottom: 12 }, metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { width: "48.5%", backgroundColor: colors.surface, borderRadius: radii.md, padding: 14, borderWidth: 1, borderColor: colors.border }, metricIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.tealSoft }, metricValue: { color: colors.ink, fontSize: 19, fontWeight: "800", marginTop: 13 }, metricLabel: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  racewayRow: { gap: 10, paddingBottom: 4 },
  racewayEmptyCard: { marginHorizontal: 0, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.border },
  racewayEmptyCopy: { flex: 1 },
  racewayEmptyTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  racewayEmptyHint: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  todayCard: { backgroundColor: colors.surface, borderRadius: radii.md, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border }, todayHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }, todayTitle: { fontSize: 15, fontWeight: "800", color: colors.ink }, metricRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border }, metricRowLast: { borderBottomWidth: 0, paddingBottom: 2 }, rowIcon: { width: 32, height: 32, backgroundColor: colors.tealSoft, borderRadius: 16, alignItems: "center", justifyContent: "center" }, rowLabel: { color: colors.ink, fontWeight: "700", fontSize: 13 }, rowValue: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  ledgerCard: { marginHorizontal: 0, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.border }, ledgerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" }, ledgerCopy: { flex: 1 }, ledgerLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: "700" }, ledgerValue: { color: colors.ink, fontSize: 19, fontWeight: "800", marginTop: 2 }, ledgerHint: { color: colors.teal, fontSize: 12, fontWeight: "700", marginTop: 3 },
  industryCard: { marginHorizontal: 0, marginTop: 20, borderWidth: 1, borderColor: colors.border },
  industryHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  industryLabel: { fontSize: 11, fontWeight: "800", color: colors.teal, letterSpacing: 0.6 },
  industryTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginTop: 8 },
  industryHint: { fontSize: 12, fontWeight: "700", color: colors.teal, marginTop: 6 },
});
