import { apiClient } from "./client";
import { Farm, FarmSystemType } from "./types";

export function fetchFarm() {
  return apiClient.get<{ farm: Farm | null }>("/farm").then((r) => r.data.farm);
}

export interface RacewayDraft {
  name: string;
  lengthM: string;
  widthM: string;
  depthM: string;
}

export interface SaveFarmInput {
  systemType: FarmSystemType;
  latitude?: number;
  longitude?: number;
  address?: string;
  registrationNumber?: string;
  raceways: RacewayDraft[];
  photo?: { uri: string; name: string; type: string };
  identityProof?: { uri: string; name: string; type: string };
  registrationDoc?: { uri: string; name: string; type: string };
}

export function saveFarm(input: SaveFarmInput) {
  const form = new FormData();
  form.append("systemType", input.systemType);
  if (input.latitude !== undefined) form.append("latitude", String(input.latitude));
  if (input.longitude !== undefined) form.append("longitude", String(input.longitude));
  if (input.address) form.append("address", input.address);
  if (input.registrationNumber) form.append("registrationNumber", input.registrationNumber);
  form.append(
    "raceways",
    JSON.stringify(
      input.raceways.map((r) => ({
        name: r.name,
        lengthM: Number(r.lengthM),
        widthM: Number(r.widthM),
        depthM: Number(r.depthM),
      }))
    )
  );
  // React Native's FormData accepts a { uri, name, type } file descriptor here,
  // which the DOM-oriented FormData typings don't model.
  if (input.photo) form.append("photo", input.photo as unknown as Blob);
  if (input.identityProof) form.append("identityProof", input.identityProof as unknown as Blob);
  if (input.registrationDoc) form.append("registrationDoc", input.registrationDoc as unknown as Blob);

  return apiClient
    .put<{ farm: Farm }>("/farm", form, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data.farm);
}
