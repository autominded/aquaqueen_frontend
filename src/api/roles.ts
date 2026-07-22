import { apiClient } from "./client";
import { Permission, Role } from "./types";

export function fetchRoles() {
  return apiClient.get<{ roles: Role[] }>("/roles").then((r) => r.data.roles);
}

export function fetchPermissionCatalog() {
  return apiClient.get<{ permissions: Permission[] }>("/roles/permissions").then((r) => r.data.permissions);
}

export function createRole(input: { name: string; permissionKeys: string[] }) {
  return apiClient.post<{ role: Role }>("/roles", input).then((r) => r.data.role);
}

export function updateRole(id: string, input: { name?: string; permissionKeys?: string[] }) {
  return apiClient.patch<{ role: Role }>(`/roles/${id}`, input).then((r) => r.data.role);
}
