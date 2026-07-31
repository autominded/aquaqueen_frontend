import { apiClient } from "./client";
import { HatcheryBatch, HatcheryBatchSale, HatcheryMortalityEntry, HatcheryStage, HatcheryStatus } from "./types";

export function fetchHatcheryBatches() {
  return apiClient.get<{ batches: HatcheryBatch[] }>("/hatchery-batches").then((r) => r.data.batches);
}

export function fetchHatcheryBatch(id: string) {
  return apiClient
    .get<{ batch: HatcheryBatch; mortalityEntries: HatcheryMortalityEntry[]; sales: HatcheryBatchSale[] }>(
      `/hatchery-batches/${id}`
    )
    .then((r) => r.data);
}

export function createHatcheryBatch(input: {
  species: string;
  eggCount: number;
  startDate: string;
  expectedHatchDate: string;
  broodstockId?: string;
  trayId?: string;
  strippingDate?: string;
  notes?: string;
}) {
  return apiClient.post<{ batch: HatcheryBatch }>("/hatchery-batches", input).then((r) => r.data.batch);
}

export function updateHatcheryBatch(
  id: string,
  input: {
    stage?: HatcheryStage;
    status?: HatcheryStatus;
    trayId?: string | null;
    eyedDate?: string;
    hatchedDate?: string;
    notes?: string;
  }
) {
  return apiClient.patch<{ batch: HatcheryBatch }>(`/hatchery-batches/${id}`, input).then((r) => r.data.batch);
}

export function createHatcheryMortalityEntry(
  hatcheryBatchId: string,
  input: { date: string; count: number; cause?: string; notes?: string }
) {
  return apiClient
    .post<{ entry: HatcheryMortalityEntry }>(`/hatchery-batches/${hatcheryBatchId}/mortality`, input)
    .then((r) => r.data.entry);
}

export function createHatcheryBatchSale(
  hatcheryBatchId: string,
  input: { date: string; quantity: number; pricePerPiece: number; buyerName?: string; notes?: string }
) {
  return apiClient
    .post<{ sale: HatcheryBatchSale }>(`/hatchery-batches/${hatcheryBatchId}/sales`, input)
    .then((r) => r.data.sale);
}
