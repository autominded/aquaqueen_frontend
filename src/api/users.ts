import { apiClient } from "./client";
import { TeamMember } from "./types";

export function fetchTeam() {
  return apiClient.get<{ users: TeamMember[] }>("/users").then((r) => r.data.users);
}

export function createTeamMember(input: { name: string; email: string; password: string; roleId: string }) {
  return apiClient.post<{ user: TeamMember }>("/users", input).then((r) => r.data.user);
}

export function updateTeamMemberRole(id: string, roleId: string) {
  return apiClient.patch<{ user: TeamMember }>(`/users/${id}`, { roleId }).then((r) => r.data.user);
}

export function deactivateTeamMember(id: string) {
  return apiClient.post<{ user: TeamMember }>(`/users/${id}/deactivate`).then((r) => r.data.user);
}

export function reactivateTeamMember(id: string) {
  return apiClient.post<{ user: TeamMember }>(`/users/${id}/reactivate`).then((r) => r.data.user);
}
