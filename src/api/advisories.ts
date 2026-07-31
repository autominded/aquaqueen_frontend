import { apiClient } from "./client";
import { AdminAdvisory, Advisory, AdvisorySeverity, AdvisoryType } from "./types";

export function fetchActiveAdvisories() {
  return apiClient.get<{ advisories: Advisory[] }>("/advisories").then((r) => r.data.advisories);
}

export function dismissAdvisory(id: string) {
  return apiClient.post(`/advisories/${id}/dismiss`);
}

export function registerPushToken(pushToken: string) {
  return apiClient.post("/advisories/push-token", { pushToken });
}

export function fetchAllAdvisories() {
  return apiClient.get<{ advisories: AdminAdvisory[] }>("/admin/advisories").then((r) => r.data.advisories);
}

export function createAdvisory(input: { title: string; body: string; severity: AdvisorySeverity; type: AdvisoryType; expiresAt?: string }) {
  return apiClient.post<{ advisory: AdminAdvisory }>("/admin/advisories", input).then((r) => r.data.advisory);
}
