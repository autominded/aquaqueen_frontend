import { apiClient } from "./client";
import { PlatformSettings } from "./types";

export function fetchPlatformSettings() {
  return apiClient.get<{ settings: PlatformSettings }>("/admin/settings").then((r) => r.data.settings);
}

export function updatePlatformSettings(input: Partial<Omit<PlatformSettings, "id" | "updatedAt">>) {
  return apiClient.put<{ settings: PlatformSettings }>("/admin/settings", input).then((r) => r.data.settings);
}
