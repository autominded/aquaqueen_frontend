import * as Sentry from "@sentry/react-native";

// Strictly opt-in: no-ops entirely unless EXPO_PUBLIC_SENTRY_DSN is set,
// since we can't provision a real Sentry project here — set the env var
// (and rebuild) and this activates with zero further code changes.
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({ dsn, environment: __DEV__ ? "development" : "production" });
}
