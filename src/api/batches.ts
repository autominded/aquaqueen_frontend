import { apiClient } from "./client";
import {
  Batch,
  BatchStage,
  BatchStatus,
  FeedEntry,
  SamplingEntry,
  MortalityEntry,
  WaterQualityReading,
  RacewayOperations,
} from "./types";

export function fetchBatches() {
  return apiClient.get<{ batches: Batch[] }>("/batches").then((r) => r.data.batches);
}

export function fetchBatch(id: string) {
  return apiClient.get<{ batch: Batch }>(`/batches/${id}`).then((r) => r.data.batch);
}

export function updateBatch(
  id: string,
  input: Partial<{
    species: string;
    stage: BatchStage;
    location: string;
    currentCount: number;
    status: BatchStatus;
    stockings: { racewayId: string; count: number }[];
    avgWeightG: number;
  }>
) {
  return apiClient.patch<{ batch: Batch }>(`/batches/${id}`, input).then((r) => r.data.batch);
}

export function deleteBatch(id: string) {
  return apiClient.delete(`/batches/${id}`);
}

export function fetchRacewayOperations(racewayId: string) {
  return apiClient.get<RacewayOperations>(`/raceways/${racewayId}/operations`).then((r) => r.data);
}

export function createBatch(input: {
  code: string;
  species: string;
  stage: BatchStage;
  // Either a raceway split (farms with raceways configured) or free-text
  // location (farms with none yet) — see RacewayAllocationEditor /
  // NewBatchScreen.
  location?: string;
  stockings?: { racewayId: string; count: number }[];
  startDate: string;
  initialCount: number;
  initialAvgWeightG: number;
}) {
  return apiClient.post<{ batch: Batch }>("/batches", input).then((r) => r.data.batch);
}

export function fetchFeedEntries(batchId: string) {
  return apiClient.get<{ entries: FeedEntry[] }>(`/batches/${batchId}/feed`).then((r) => r.data.entries);
}

export function createFeedEntry(
  batchId: string,
  input: {
    date: string;
    pelletSizeId: string;
    feedManufacturerId?: string;
    quantityKg: number;
    racewayId?: string;
    notes?: string;
  }
) {
  return apiClient.post<{ entry: FeedEntry }>(`/batches/${batchId}/feed`, input).then((r) => r.data.entry);
}

export function fetchSamplingEntries(batchId: string) {
  return apiClient.get<{ entries: SamplingEntry[] }>(`/batches/${batchId}/sampling`).then((r) => r.data.entries);
}

export function createSamplingEntry(
  batchId: string,
  input: { date: string; avgWeightG: number; sampleSize: number; racewayId?: string; notes?: string }
) {
  return apiClient.post<{ entry: SamplingEntry }>(`/batches/${batchId}/sampling`, input).then((r) => r.data.entry);
}

export function fetchMortalityEntries(batchId: string) {
  return apiClient.get<{ entries: MortalityEntry[] }>(`/batches/${batchId}/mortality`).then((r) => r.data.entries);
}

export function createMortalityEntry(
  batchId: string,
  input: { date: string; count: number; cause?: string; racewayId?: string; notes?: string }
) {
  return apiClient.post<{ entry: MortalityEntry }>(`/batches/${batchId}/mortality`, input).then((r) => r.data.entry);
}

export function uploadMortalityPhoto(
  batchId: string,
  mortalityId: string,
  file: { uri: string; name: string; type: string; file?: File }
) {
  const form = new FormData();
  if (file.file) {
    form.append("photo", file.file, file.name);
  } else {
    // React Native's FormData accepts a { uri, name, type } file descriptor
    // here, which the DOM-oriented FormData typings don't model.
    form.append("photo", file as unknown as Blob);
  }
  return apiClient
    .post<{ entry: MortalityEntry }>(`/batches/${batchId}/mortality/${mortalityId}/photo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data.entry);
}

export function fetchWaterQualityReadings(batchId: string) {
  return apiClient
    .get<{ entries: WaterQualityReading[] }>(`/batches/${batchId}/water-quality`)
    .then((r) => r.data.entries);
}

export function createWaterQualityReading(
  batchId: string,
  input: {
    date: string;
    temperatureC: number;
    dissolvedOxygen: number;
    ph: number;
    ammonia: number;
    racewayId?: string;
    notes?: string;
  }
) {
  return apiClient
    .post<{ entry: WaterQualityReading }>(`/batches/${batchId}/water-quality`, input)
    .then((r) => r.data.entry);
}
