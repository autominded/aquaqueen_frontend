import { apiClient } from "./client";
import { AdminOrganization, AdminUser } from "./types";

export function fetchAdminUsers() {
  return apiClient.get<{ users: AdminUser[] }>("/admin/users").then((r) => r.data.users);
}

export function impersonateUser(userId: string) {
  return apiClient.post<{ token: string }>(`/admin/impersonate/${userId}`).then((r) => r.data.token);
}

export function lockAdminUser(userId: string) {
  return apiClient.post<{ user: AdminUser }>(`/admin/users/${userId}/lock`).then((r) => r.data.user);
}

export function resumeAdminUser(userId: string) {
  return apiClient.post<{ user: AdminUser }>(`/admin/users/${userId}/resume`).then((r) => r.data.user);
}

export function removeAdminUser(userId: string) {
  return apiClient.delete(`/admin/users/${userId}`);
}

export function fetchAdminOrganizations() {
  return apiClient.get<{ organizations: AdminOrganization[] }>("/admin/organizations").then((r) => r.data.organizations);
}

export function lockOrganization(organizationId: string) {
  return apiClient
    .post<{ organization: AdminOrganization }>(`/admin/organizations/${organizationId}/lock`)
    .then((r) => r.data.organization);
}

export function resumeOrganization(organizationId: string) {
  return apiClient
    .post<{ organization: AdminOrganization }>(`/admin/organizations/${organizationId}/resume`)
    .then((r) => r.data.organization);
}

export function removeOrganization(organizationId: string) {
  return apiClient.delete(`/admin/organizations/${organizationId}`);
}
