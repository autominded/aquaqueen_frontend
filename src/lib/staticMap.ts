// Builds a Google Static Maps URL for a read-only pin preview — the
// non-interactive alternative to a full map SDK (see plan: this keeps the
// farm-setup screen web/Expo-Go compatible; only phone OTP needs a native build).
export function staticMapUrl(lat: number, lng: number, apiKey: string | null | undefined): string | null {
  if (!apiKey) return null;
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: "15",
    size: "600x300",
    markers: `color:red|${lat},${lng}`,
    key: apiKey,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
