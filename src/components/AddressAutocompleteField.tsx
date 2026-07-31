import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchPlaceAutocomplete, fetchPlaceDetails } from "../api/places";
import { FormField } from "./FormField";
import { colors, radii } from "../theme";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onPlaceSelected: (details: { latitude: number; longitude: number; formattedAddress: string }) => void;
}

// Additive alongside the existing GPS "Use current location" capture, not a
// replacement — lets the farm owner search for and pick a real address
// (Places Autocomplete + Details, proxied through server/src/routes/places.ts)
// instead of relying on GPS precision.
export function AddressAutocompleteField({ value, onChangeText, onPlaceSelected }: Props) {
  const [debouncedInput, setDebouncedInput] = useState(value);
  const [selecting, setSelecting] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedInput(value), 350);
    return () => clearTimeout(handle);
  }, [value]);

  const query = useQuery({
    queryKey: ["place-autocomplete", debouncedInput],
    queryFn: () => fetchPlaceAutocomplete(debouncedInput),
    enabled: debouncedInput.trim().length >= 3 && !dismissed,
  });

  const selectSuggestion = async (placeId: string) => {
    setSelecting(true);
    setDismissed(true);
    try {
      const details = await fetchPlaceDetails(placeId);
      if (details.latitude != null && details.longitude != null) {
        const formattedAddress = details.formattedAddress ?? value;
        onChangeText(formattedAddress);
        onPlaceSelected({ latitude: details.latitude, longitude: details.longitude, formattedAddress });
      }
    } finally {
      setSelecting(false);
    }
  };

  const suggestions = dismissed ? [] : (query.data ?? []);

  return (
    <View>
      <FormField
        label="Address"
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          setDismissed(false);
        }}
        placeholder="Start typing an address…"
      />
      {selecting && <ActivityIndicator size="small" color={colors.teal} style={styles.spinner} />}
      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s.placeId} onPress={() => selectSuggestion(s.placeId)} style={styles.suggestionRow}>
              <Text style={styles.suggestionText}>{s.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: -8, marginBottom: 12 },
  suggestions: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: -8,
    marginBottom: 16,
    overflow: "hidden",
  },
  suggestionRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  suggestionText: { fontSize: 14, color: colors.ink },
});
