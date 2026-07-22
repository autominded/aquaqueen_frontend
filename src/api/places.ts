import { apiClient } from "./client";

export interface PlaceSuggestion {
  placeId: string;
  description: string;
}

export interface PlaceDetails {
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string | null;
}

export function fetchPlaceAutocomplete(input: string) {
  return apiClient
    .get<{ suggestions: PlaceSuggestion[] }>("/places/autocomplete", { params: { input } })
    .then((r) => r.data.suggestions);
}

export function fetchPlaceDetails(placeId: string) {
  return apiClient.get<PlaceDetails>("/places/details", { params: { placeId } }).then((r) => r.data);
}
