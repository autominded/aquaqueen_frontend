import { apiClient } from "./client";
import { HatcheryRaceway } from "./types";

export interface HatcheryRacewayInput {
  name: string;
  lengthM: number;
  widthM: number;
  depthM: number;
}

export function fetchHatcheryRaceways() {
  return apiClient.get<{ raceways: HatcheryRaceway[] }>("/hatchery-raceways").then((r) => r.data.raceways);
}

export function createHatcheryRaceway(input: HatcheryRacewayInput) {
  return apiClient.post<{ raceway: HatcheryRaceway }>("/hatchery-raceways", input).then((r) => r.data.raceway);
}

export function updateHatcheryRaceway(id: string, input: HatcheryRacewayInput) {
  return apiClient.patch<{ raceway: HatcheryRaceway }>(`/hatchery-raceways/${id}`, input).then((r) => r.data.raceway);
}

export function deleteHatcheryRaceway(id: string) {
  return apiClient.delete(`/hatchery-raceways/${id}`);
}
