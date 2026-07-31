import { apiClient } from "./client";
import { Species } from "./types";

export function fetchSpecies() {
  return apiClient.get<{ species: Species[] }>("/species").then((r) => r.data.species);
}

export function createSpecies(name: string) {
  return apiClient.post<{ species: Species }>("/species", { name }).then((r) => r.data.species);
}

export function updateSpecies(id: string, name: string) {
  return apiClient.patch<{ species: Species }>(`/species/${id}`, { name }).then((r) => r.data.species);
}

export function deleteSpecies(id: string) {
  return apiClient.delete(`/species/${id}`);
}
