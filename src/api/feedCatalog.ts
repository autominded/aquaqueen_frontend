import { apiClient } from "./client";
import { FeedInventoryItem, FeedInventoryLedgerEntry, FeedManufacturer, PelletSize } from "./types";

export function fetchFeedManufacturers() {
  return apiClient.get<{ manufacturers: FeedManufacturer[] }>("/feed-catalog/manufacturers").then((r) => r.data.manufacturers);
}

export function createFeedManufacturer(name: string) {
  return apiClient.post<{ manufacturer: FeedManufacturer }>("/feed-catalog/manufacturers", { name }).then((r) => r.data.manufacturer);
}

export function updateFeedManufacturer(id: string, name: string) {
  return apiClient.patch<{ manufacturer: FeedManufacturer }>(`/feed-catalog/manufacturers/${id}`, { name }).then((r) => r.data.manufacturer);
}

export function deleteFeedManufacturer(id: string) {
  return apiClient.delete(`/feed-catalog/manufacturers/${id}`);
}

export function fetchPelletSizes() {
  return apiClient.get<{ pelletSizes: PelletSize[] }>("/feed-catalog/pellet-sizes").then((r) => r.data.pelletSizes);
}

export function createPelletSize(label: string) {
  return apiClient.post<{ pelletSize: PelletSize }>("/feed-catalog/pellet-sizes", { label }).then((r) => r.data.pelletSize);
}

export function updatePelletSize(id: string, label: string) {
  return apiClient.patch<{ pelletSize: PelletSize }>(`/feed-catalog/pellet-sizes/${id}`, { label }).then((r) => r.data.pelletSize);
}

export function deletePelletSize(id: string) {
  return apiClient.delete(`/feed-catalog/pellet-sizes/${id}`);
}

export function fetchFeedInventory() {
  return apiClient.get<{ inventory: FeedInventoryItem[] }>("/feed-catalog/inventory").then((r) => r.data.inventory);
}

export function fetchFeedInventoryLedger(pelletSizeId: string) {
  return apiClient
    .get<{ entries: FeedInventoryLedgerEntry[] }>(`/feed-catalog/inventory/${pelletSizeId}/ledger`)
    .then((r) => r.data.entries);
}
