import { apiClient } from "./client";
import { Broodstock, PhotoperiodEntry, StrippingPlan, StrippingPlanStatus } from "./types";

export function fetchBroodstocks() {
  return apiClient.get<{ broodstocks: Broodstock[] }>("/broodstock").then((r) => r.data.broodstocks);
}

export function fetchBroodstock(id: string) {
  return apiClient
    .get<{ broodstock: Broodstock; photoperiodEntries: PhotoperiodEntry[]; strippingPlans: StrippingPlan[] }>(
      `/broodstock/${id}`
    )
    .then((r) => r.data);
}

export function createBroodstock(input: { racewayId: string; species: string; count: number; stockedDate: string; notes?: string }) {
  return apiClient.post<{ broodstock: Broodstock }>("/broodstock", input).then((r) => r.data.broodstock);
}

export function updateBroodstock(id: string, input: Partial<{ species: string; count: number; notes: string }>) {
  return apiClient.patch<{ broodstock: Broodstock }>(`/broodstock/${id}`, input).then((r) => r.data.broodstock);
}

export function deleteBroodstock(id: string) {
  return apiClient.delete(`/broodstock/${id}`);
}

export function createPhotoperiodEntry(broodstockId: string, input: { date: string; lightHours: number; notes?: string }) {
  return apiClient
    .post<{ entry: PhotoperiodEntry }>(`/broodstock/${broodstockId}/photoperiod`, input)
    .then((r) => r.data.entry);
}

export function createStrippingPlan(broodstockId: string, input: { plannedDate: string; notes?: string }) {
  return apiClient
    .post<{ plan: StrippingPlan }>(`/broodstock/${broodstockId}/stripping-plans`, input)
    .then((r) => r.data.plan);
}

export function updateStrippingPlan(
  broodstockId: string,
  planId: string,
  input: Partial<{ status: StrippingPlanStatus; plannedDate: string; notes: string }>
) {
  return apiClient
    .patch<{ plan: StrippingPlan }>(`/broodstock/${broodstockId}/stripping-plans/${planId}`, input)
    .then((r) => r.data.plan);
}
