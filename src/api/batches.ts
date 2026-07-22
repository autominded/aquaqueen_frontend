import { apiClient } from "./client";
import {
  Batch,
  BatchStage,
  FeedEntry,
  SamplingEntry,
  MortalityEntry,
  WaterQualityReading,
  HarvestPlan,
  HarvestPlanStatus,
} from "./types";

export function fetchBatches() {
  return apiClient.get<{ batches: Batch[] }>("/batches").then((r) => r.data.batches);
}

export function fetchBatch(id: string) {
  return apiClient.get<{ batch: Batch }>(`/batches/${id}`).then((r) => r.data.batch);
}

export function createBatch(input: {
  code: string;
  species: string;
  stage: BatchStage;
  location: string;
  startDate: string;
  initialCount: number;
}) {
  return apiClient.post<{ batch: Batch }>("/batches", input).then((r) => r.data.batch);
}

export function fetchFeedEntries(batchId: string) {
  return apiClient.get<{ entries: FeedEntry[] }>(`/batches/${batchId}/feed`).then((r) => r.data.entries);
}

export function createFeedEntry(batchId: string, input: { date: string; feedType: string; quantityKg: number; notes?: string }) {
  return apiClient.post<{ entry: FeedEntry }>(`/batches/${batchId}/feed`, input).then((r) => r.data.entry);
}

export function fetchSamplingEntries(batchId: string) {
  return apiClient.get<{ entries: SamplingEntry[] }>(`/batches/${batchId}/sampling`).then((r) => r.data.entries);
}

export function createSamplingEntry(
  batchId: string,
  input: { date: string; avgWeightG: number; sampleSize: number; notes?: string }
) {
  return apiClient.post<{ entry: SamplingEntry }>(`/batches/${batchId}/sampling`, input).then((r) => r.data.entry);
}

export function fetchMortalityEntries(batchId: string) {
  return apiClient.get<{ entries: MortalityEntry[] }>(`/batches/${batchId}/mortality`).then((r) => r.data.entries);
}

export function createMortalityEntry(
  batchId: string,
  input: { date: string; count: number; cause?: string; notes?: string }
) {
  return apiClient.post<{ entry: MortalityEntry }>(`/batches/${batchId}/mortality`, input).then((r) => r.data.entry);
}

export function fetchWaterQualityReadings(batchId: string) {
  return apiClient
    .get<{ entries: WaterQualityReading[] }>(`/batches/${batchId}/water-quality`)
    .then((r) => r.data.entries);
}

export function createWaterQualityReading(
  batchId: string,
  input: { date: string; temperatureC: number; dissolvedOxygen: number; ph: number; ammonia: number; notes?: string }
) {
  return apiClient
    .post<{ entry: WaterQualityReading }>(`/batches/${batchId}/water-quality`, input)
    .then((r) => r.data.entry);
}

export function fetchHarvestPlans(batchId: string) {
  return apiClient.get<{ plans: HarvestPlan[] }>(`/batches/${batchId}/harvest-plans`).then((r) => r.data.plans);
}

export function createHarvestPlan(
  batchId: string,
  input: { plannedDate: string; targetWeightG: number; targetCount: number; notes?: string }
) {
  return apiClient.post<{ plan: HarvestPlan }>(`/batches/${batchId}/harvest-plans`, input).then((r) => r.data.plan);
}

export function updateHarvestPlan(id: string, input: { status: HarvestPlanStatus }) {
  return apiClient.patch<{ plan: HarvestPlan }>(`/harvest-plans/${id}`, input).then((r) => r.data.plan);
}
