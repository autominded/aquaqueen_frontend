import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config";

const TOKEN_KEY = "aquaqueen_token";
// Holds the super admin's own token while they're impersonating another
// user, so "back to my profile" can restore it without a second login.
const ADMIN_TOKEN_KEY = "aquaqueen_admin_token";

export const apiClient = axios.create({ baseURL: API_BASE_URL });

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(handler: () => void) {
  onUnauthorized = handler;
}

// expo-secure-store has no web implementation, so fall back to
// localStorage there (fine for a v1 web preview; native builds get real
// secure storage).
async function getItem(key: string) {
  if (Platform.OS === "web") return window.localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string) {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const getToken = () => getItem(TOKEN_KEY);
export const setToken = (token: string) => setItem(TOKEN_KEY, token);
export const clearToken = () => removeItem(TOKEN_KEY);

export const getAdminToken = () => getItem(ADMIN_TOKEN_KEY);
export const setAdminToken = (token: string) => setItem(ADMIN_TOKEN_KEY, token);
export const clearAdminToken = () => removeItem(ADMIN_TOKEN_KEY);

apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await clearToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error ?? error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong";
}
