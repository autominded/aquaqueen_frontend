import { apiClient } from "./client";
import { FarmInventoryItem, FarmInventoryItemEntry } from "./types";

export function fetchFarmInventoryItems() {
  return apiClient.get<{ items: FarmInventoryItem[] }>("/farm-inventory").then((r) => r.data.items);
}

export function createFarmInventoryItem(name: string) {
  return apiClient.post<{ item: FarmInventoryItem }>("/farm-inventory", { name }).then((r) => r.data.item);
}

export function updateFarmInventoryItem(id: string, input: { name?: string; lowStockThreshold?: number | null }) {
  return apiClient.patch<{ item: FarmInventoryItem }>(`/farm-inventory/${id}`, input).then((r) => r.data.item);
}

export function deleteFarmInventoryItem(id: string) {
  return apiClient.delete(`/farm-inventory/${id}`);
}

export function fetchFarmInventoryEntries(itemId: string) {
  return apiClient
    .get<{ entries: FarmInventoryItemEntry[] }>(`/farm-inventory/${itemId}/entries`)
    .then((r) => r.data.entries);
}

export function createFarmInventoryEntry(
  itemId: string,
  input: { quantity: number; purchasePrice: number; date: string; notes?: string }
) {
  return apiClient
    .post<{ entry: FarmInventoryItemEntry }>(`/farm-inventory/${itemId}/entries`, input)
    .then((r) => r.data.entry);
}

export function uploadFarmInventoryBill(
  itemId: string,
  entryId: string,
  file: { uri: string; name: string; type: string; file?: File }
) {
  const form = new FormData();
  if (file.file) {
    form.append("bill", file.file, file.name);
  } else {
    // React Native's FormData accepts a { uri, name, type } file descriptor
    // here, which the DOM-oriented FormData typings don't model.
    form.append("bill", file as unknown as Blob);
  }
  return apiClient
    .post<{ entry: FarmInventoryItemEntry }>(`/farm-inventory/${itemId}/entries/${entryId}/bill`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data.entry);
}
