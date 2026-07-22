import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary, fetchDashboardAlerts } from "../api/dashboard";
import { LoadingView } from "../components/LoadingView";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Card } from "../components/Card";
import { PrimaryButton } from "../components/PrimaryButton";
import { apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

export function DashboardScreen() {
  const { user, logout } = useAuth();
  const summaryQuery = useQuery({ queryKey: ["dashboard-summary"], queryFn: fetchDashboardSummary });
  const alertsQuery = useQuery({ queryKey: ["dashboard-alerts"], queryFn: fetchDashboardAlerts });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.name.split(" ")[0]}</Text>
          <Text style={styles.subGreeting}>Farm overview</Text>
        </View>
        <PrimaryButton title="Log out" variant="secondary" onPress={logout} style={styles.logoutButton} />
      </View>

      {summaryQuery.isPending && <LoadingView />}
      {summaryQuery.isError && <ErrorBanner message={apiErrorMessage(summaryQuery.error)} onRetry={summaryQuery.refetch} />}
      {summaryQuery.data && (
        <View style={styles.statsGrid}>
          <StatCard label="Active batches" value={summaryQuery.data.totalActiveBatches.toString()} />
          <StatCard label="Total fish" value={summaryQuery.data.totalFishCount.toLocaleString()} />
          <StatCard label="Est. biomass" value={`${summaryQuery.data.estimatedBiomassKg.toLocaleString()} kg`} />
          <StatCard label="Feed (7d)" value={`${summaryQuery.data.feedGivenLast7dKg.toLocaleString()} kg`} />
          <StatCard label="Mortality (7d)" value={summaryQuery.data.mortalityLast7d.toString()} />
          <StatCard label="Hatchery batches" value={summaryQuery.data.activeHatcheryBatches.toString()} />
        </View>
      )}

      <Text style={styles.sectionTitle}>Alerts</Text>
      {alertsQuery.isPending && <LoadingView />}
      {alertsQuery.isError && <ErrorBanner message={apiErrorMessage(alertsQuery.error)} onRetry={alertsQuery.refetch} />}
      {alertsQuery.data?.length === 0 && <EmptyState title="No alerts" subtitle="Everything looks on track." />}
      {alertsQuery.data?.map((alert, i) => (
        <Card key={`${alert.batchId}-${alert.type}-${i}`} style={styles.alertCard}>
          <Text style={styles.alertType}>{alert.type.replace(/_/g, " ")}</Text>
          <Text style={styles.alertMessage}>{alert.message}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7f7" },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greeting: { fontSize: 22, fontWeight: "800", color: "#1c2424" },
  subGreeting: { fontSize: 14, color: "#7a8787", marginTop: 2 },
  logoutButton: { paddingHorizontal: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "31%",
    backgroundColor: "white",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  statValue: { fontSize: 16, fontWeight: "800", color: "#0b6e6e" },
  statLabel: { fontSize: 11, color: "#7a8787", marginTop: 4, textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1c2424", marginTop: 24, marginBottom: 8 },
  alertCard: { marginHorizontal: 0, borderLeftWidth: 4, borderLeftColor: "#c0392b" },
  alertType: { fontSize: 11, fontWeight: "700", color: "#c0392b", textTransform: "capitalize" },
  alertMessage: { fontSize: 14, color: "#1c2424", marginTop: 4 },
});
