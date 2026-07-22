// Android emulator can't reach the host via localhost — use 10.0.2.2 there,
// or set EXPO_PUBLIC_API_URL to your machine's LAN IP for a physical device.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";

// Uploaded files (e.g. farm photos) are served from the API's origin, not
// under /api — strip the suffix to get a base for building their URLs.
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
