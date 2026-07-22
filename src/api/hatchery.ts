import { apiClient } from "./client";
import { HatcheryBatch, HatcheryStage, HatcheryStatus } from "./types";

export function fetchHatcheryBatches() {
  return apiClient.get<{ batches: HatcheryBatch[] }>("/hatchery-batches").then((r) => r.data.batches);
}

export function createHatcheryBatch(input: {
  species: string;
  eggCount: number;
  startDate: string;
  expectedHatchDate: string;
  notes?: string;
}) {
  return apiClient.post<{ batch: HatcheryBatch }>("/hatchery-batches", input).then((r) => r.data.batch);
}

export function updateHatcheryBatch(id: string, input: { stage?: HatcheryStage; status?: HatcheryStatus }) {
  return apiClient.patch<{ batch: HatcheryBatch }>(`/hatchery-batches/${id}`, input).then((r) => r.data.batch);
}
