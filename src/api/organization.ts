import { apiClient } from "./client";

export function updateOrganization(name: string) {
  return apiClient
    .patch<{ organization: { id: string; name: string } }>("/organization", { name })
    .then((r) => r.data.organization);
}
