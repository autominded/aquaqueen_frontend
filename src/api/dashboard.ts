import { apiClient } from "./client";
import { DashboardSummary, DashboardAlert } from "./types";

export function fetchDashboardSummary() {
  return apiClient.get<DashboardSummary>("/dashboard/summary").then((r) => r.data);
}

export function fetchDashboardAlerts() {
  return apiClient.get<{ alerts: DashboardAlert[] }>("/dashboard/alerts").then((r) => r.data.alerts);
}
