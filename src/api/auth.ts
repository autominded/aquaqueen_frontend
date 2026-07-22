import { apiClient } from "./client";
import { User } from "./types";

export interface AuthResponse {
  token: string;
  user: User;
}

export function signup(input: {
  organizationName: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  firebaseIdToken: string;
}) {
  return apiClient.post<AuthResponse>("/auth/signup", input).then((r) => r.data);
}

export function login(input: { email: string; password: string }) {
  return apiClient.post<AuthResponse>("/auth/login", input).then((r) => r.data);
}

export function fetchMe() {
  return apiClient.get<{ user: User }>("/auth/me").then((r) => r.data.user);
}
