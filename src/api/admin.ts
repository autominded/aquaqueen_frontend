import { apiClient } from "./client";
import { AdminUser } from "./types";

export function fetchAdminUsers() {
  return apiClient.get<{ users: AdminUser[] }>("/admin/users").then((r) => r.data.users);
}

export function impersonateUser(userId: string) {
  return apiClient.post<{ token: string }>(`/admin/impersonate/${userId}`).then((r) => r.data.token);
}
