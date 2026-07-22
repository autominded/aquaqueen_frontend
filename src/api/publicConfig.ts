import { apiClient } from "./client";
import { PlatformPublicConfig } from "./types";

export function fetchPublicConfig() {
  return apiClient.get<PlatformPublicConfig>("/public/config").then((r) => r.data);
}
