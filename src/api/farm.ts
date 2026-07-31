import { apiClient } from "./client";
import { Farm, FarmSystemType } from "./types";

export function fetchFarm() {
  return apiClient.get<{ farm: Farm | null }>("/farm").then((r) => r.data.farm);
}

export interface RacewayDraft {
  // Present for a raceway that already exists on the farm — lets the save
  // update it in place instead of the server recreating it with a new id,
  // which would orphan any RacewayStocking/log entries pointing at it.
  id?: string;
  name: string;
  lengthM: string;
  widthM: string;
  depthM: string;
}

export interface FarmFileDraft {
  uri: string;
  name: string;
  type: string;
  // Web only: the real File/Blob. FormData on web needs an actual Blob to
  // attach a file — the { uri, name, type } descriptor only works with React
  // Native's own multipart handling on native platforms, not the browser's.
  // Same fix as ReceiptPicker/uploadPurchaseReceipt.
  file?: File;
}

export interface SaveFarmInput {
  systemType: FarmSystemType;
  latitude?: number;
  longitude?: number;
  address?: string;
  registrationNumber?: string;
  raceways: RacewayDraft[];
  photo?: FarmFileDraft;
  logo?: FarmFileDraft;
  identityProof?: FarmFileDraft;
  registrationDoc?: FarmFileDraft;
}

function appendFile(form: FormData, field: string, file: FarmFileDraft) {
  if (file.file) {
    form.append(field, file.file, file.name);
  } else {
    // React Native's FormData accepts a { uri, name, type } file descriptor
    // here, which the DOM-oriented FormData typings don't model.
    form.append(field, file as unknown as Blob);
  }
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
        id: r.id,
        name: r.name,
        lengthM: Number(r.lengthM),
        widthM: Number(r.widthM),
        depthM: Number(r.depthM),
      }))
    )
  );
  if (input.photo) appendFile(form, "photo", input.photo);
  if (input.logo) appendFile(form, "logo", input.logo);
  if (input.identityProof) appendFile(form, "identityProof", input.identityProof);
  if (input.registrationDoc) appendFile(form, "registrationDoc", input.registrationDoc);

  return apiClient
    .put<{ farm: Farm }>("/farm", form, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data.farm);
}
