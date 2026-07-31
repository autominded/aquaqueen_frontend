import { apiClient } from "./client";
import { DashboardSummary, DashboardAlert, RacewayOverview, DashboardFarmStatus, DashboardFinanceGlance } from "./types";

export function fetchDashboardSummary() {
  return apiClient.get<DashboardSummary>("/dashboard/summary").then((r) => r.data);
}

export function fetchDashboardRaceways() {
  return apiClient.get<{ raceways: RacewayOverview[] }>("/dashboard/raceways").then((r) => r.data.raceways);
}

export function fetchDashboardAlerts() {
  return apiClient.get<{ alerts: DashboardAlert[] }>("/dashboard/alerts").then((r) => r.data.alerts);
}

export function fetchDashboardFarmStatus() {
  return apiClient.get<DashboardFarmStatus>("/dashboard/farm-status").then((r) => r.data);
}

export function fetchDashboardFinanceGlance() {
  return apiClient.get<DashboardFinanceGlance>("/dashboard/finance-glance").then((r) => r.data);
}
