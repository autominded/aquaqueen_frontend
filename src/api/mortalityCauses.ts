import { apiClient } from "./client";
import { MortalityCause } from "./types";

export function fetchMortalityCauses() {
  return apiClient.get<{ causes: MortalityCause[] }>("/mortality-causes").then((r) => r.data.causes);
}

export function createMortalityCause(name: string) {
  return apiClient.post<{ cause: MortalityCause }>("/mortality-causes", { name }).then((r) => r.data.cause);
}

export function updateMortalityCause(id: string, name: string) {
  return apiClient.patch<{ cause: MortalityCause }>(`/mortality-causes/${id}`, { name }).then((r) => r.data.cause);
}

export function deleteMortalityCause(id: string) {
  return apiClient.delete(`/mortality-causes/${id}`);
}
