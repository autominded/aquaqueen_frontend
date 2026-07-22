import { apiClient } from "./client";
import { TeamMember } from "./types";

export function fetchTeam() {
  return apiClient.get<{ users: TeamMember[] }>("/users").then((r) => r.data.users);
}

export function createTeamMember(input: { name: string; email: string; password: string; roleId: string }) {
  return apiClient.post<{ user: TeamMember }>("/users", input).then((r) => r.data.user);
}
