import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { BatchesStackParamList, AppTabParamList } from "../../navigation/types";
import { fetchDashboardRaceways, fetchDashboardAlerts } from "../../api/dashboard";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { RacewayCard } from "../../components/RacewayCard";
import { apiErrorMessage } from "../../api/client";
import { colors, radii } from "../../theme";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<BatchesStackParamList, "OperationsHome">;

// Landing screen for the Operations tab: day-to-day raceway logging up top
// (same cards as the Home dashboard, now tappable into raceway-scoped
// feed/sampling/mortality/water-quality), batch management kept as a
// separate, explicit destination below rather than mixed into the same list.
export function OperationsHomeScreen({ navigation }: Props) {
  const tabNavigation = useNavigation<BottomTabNavigationProp<AppTabParamList>>();
  const racewaysQuery = useQuery({ queryKey: ["dashboard-raceways"], queryFn: fetchDashboardRaceways });
  const alertsQuery = useQuery({ queryKey: ["dashboard-alerts"], queryFn: fetchDashboardAlerts });
  const alerts = alertsQuery.data ?? [];
  const { refreshing, onRefresh } = useRefreshing();

  return (
    <RefreshableScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.alertHeading}>
        <Text style={styles.heading}>Operational Alerts</Text>
        {alerts.length > 0 && <Text style={styles.alertCount}>{alerts.length}</Text>}
      </View>
      {alertsQuery.isPending && <LoadingView />}
      {alertsQuery.isError && <ErrorBanner message={apiErrorMessage(alertsQuery.error)} onRetry={alertsQuery.refetch} />}
      {alertsQuery.data?.length === 0 && <EmptyState title="All clear" subtitle="There are no operational alerts right now." />}
      {alerts.map((alert) => (
        <Card key={alert.id} style={styles.alertCard}>
          <View style={styles.alertIcon}><AppIcon name="alert-triangle" size={18} color={colors.coral} /></View>
          <View style={styles.alertCopy}>
            <Text style={styles.alertType}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Review alert"><AppIcon name="chevron-right" /></TouchableOpacity>
        </Card>
      ))}

      <TouchableOpacity onPress={() => navigation.navigate("TasksHome")}>
        <Card style={styles.manageCard}>
          <View style={styles.manageIcon}><AppIcon name="check-square" size={18} color={colors.teal} /></View>
          <View style={styles.manageCopy}>
            <Text style={styles.manageTitle}>Tasks & reminders</Text>
            <Text style={styles.manageHint}>Daily tasks, cleaning, water changes, repairs, grading & assignments</Text>
          </View>
          <AppIcon name="chevron-right" />
        </Card>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Raceways</Text>

      {racewaysQuery.isPending && <LoadingView />}
      {racewaysQuery.isError && <ErrorBanner message={apiErrorMessage(racewaysQuery.error)} onRetry={racewaysQuery.refetch} />}
      {racewaysQuery.data?.length === 0 && (
        <TouchableOpacity onPress={() => tabNavigation.navigate("Profile", { screen: "FarmSetup" })}>
          <Card style={styles.emptyCard}>
            <AppIcon name="grid" size={18} color={colors.teal} />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>No raceways set up yet</Text>
              <Text style={styles.emptyHint}>Add them in Farm setup to log activity here</Text>
            </View>
            <AppIcon name="chevron-right" />
          </Card>
        </TouchableOpacity>
      )}
      {racewaysQuery.data && racewaysQuery.data.length > 0 && (
        <View style={styles.racewayGrid}>
          {racewaysQuery.data.map((raceway) => (
            <TouchableOpacity key={raceway.id} onPress={() => navigation.navigate("RacewayOperations", { racewayId: raceway.id })}>
              <RacewayCard raceway={raceway} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity onPress={() => navigation.navigate("BatchList")}>
        <Card style={styles.manageCard}>
          <View style={styles.manageIcon}><AppIcon name="layers" size={18} color={colors.teal} /></View>
          <View style={styles.manageCopy}>
            <Text style={styles.manageTitle}>Manage batches</Text>
            <Text style={styles.manageHint}>Create batches, view details, and plan harvests</Text>
          </View>
          <AppIcon name="chevron-right" />
        </Card>
      </TouchableOpacity>
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: 20, paddingBottom: 40 },
  eyebrow: { color: colors.teal, fontSize: 11, fontWeight: "800", letterSpacing: 1.1 },
  heading: { color: colors.ocean, fontSize: 26, fontWeight: "800", marginTop: 5, marginBottom: 16 },
  sectionTitle: { color: colors.ocean, fontSize: 18, fontWeight: "800", marginTop: 28, marginBottom: 12 },
  alertHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertCount: { backgroundColor: colors.coralSoft, color: colors.coral, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.pill, fontSize: 12, fontWeight: "800" },
  alertCard: { marginHorizontal: 0, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 11 },
  alertIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.coralSoft, alignItems: "center", justifyContent: "center" },
  alertCopy: { flex: 1 },
  alertType: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  alertMessage: { color: colors.inkMuted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  racewayGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  emptyCard: { marginHorizontal: 0, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.border },
  emptyCopy: { flex: 1 },
  emptyTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  emptyHint: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  manageCard: { marginHorizontal: 0, marginTop: 24, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.border },
  manageIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  manageCopy: { flex: 1 },
  manageTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  manageHint: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
});
