import { apiClient } from "./client";
import { Tray } from "./types";

export function fetchTrays() {
  return apiClient.get<{ trays: Tray[] }>("/trays").then((r) => r.data.trays);
}

export function createTray(name: string) {
  return apiClient.post<{ tray: Tray }>("/trays", { name }).then((r) => r.data.tray);
}

export function updateTray(id: string, name: string) {
  return apiClient.patch<{ tray: Tray }>(`/trays/${id}`, { name }).then((r) => r.data.tray);
}

export function deleteTray(id: string) {
  return apiClient.delete(`/trays/${id}`);
}
