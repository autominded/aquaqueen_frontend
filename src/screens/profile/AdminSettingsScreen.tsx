import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPlatformSettings, updatePlatformSettings } from "../../api/adminSettings";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";

// Platform-wide credentials (not org-scoped) — gated by requireSuperAdmin on
// the server, reachable only from the Profile menu's "Admin" section when
// user.isSuperAdmin is true (see ProfileScreen.tsx).
export function AdminSettingsScreen() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ["platform-settings"], queryFn: fetchPlatformSettings });

  const [seeded, setSeeded] = useState(false);
  const [firebaseApiKey, setFirebaseApiKey] = useState("");
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState("");
  const [firebaseProjectId, setFirebaseProjectId] = useState("");
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState("");
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState("");
  const [firebaseAppId, setFirebaseAppId] = useState("");
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [firebaseServiceAccountJson, setFirebaseServiceAccountJson] = useState("");

  useEffect(() => {
    if (seeded || !settingsQuery.data) return;
    const s = settingsQuery.data;
    setFirebaseApiKey(s.firebaseApiKey ?? "");
    setFirebaseAuthDomain(s.firebaseAuthDomain ?? "");
    setFirebaseProjectId(s.firebaseProjectId ?? "");
    setFirebaseStorageBucket(s.firebaseStorageBucket ?? "");
    setFirebaseMessagingSenderId(s.firebaseMessagingSenderId ?? "");
    setFirebaseAppId(s.firebaseAppId ?? "");
    setGoogleMapsApiKey(s.googleMapsApiKey ?? "");
    setFirebaseServiceAccountJson(s.firebaseServiceAccountJson ?? "");
    setSeeded(true);
  }, [seeded, settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updatePlatformSettings({
        firebaseApiKey: firebaseApiKey.trim() || undefined,
        firebaseAuthDomain: firebaseAuthDomain.trim() || undefined,
        firebaseProjectId: firebaseProjectId.trim() || undefined,
        firebaseStorageBucket: firebaseStorageBucket.trim() || undefined,
        firebaseMessagingSenderId: firebaseMessagingSenderId.trim() || undefined,
        firebaseAppId: firebaseAppId.trim() || undefined,
        googleMapsApiKey: googleMapsApiKey.trim() || undefined,
        firebaseServiceAccountJson: firebaseServiceAccountJson.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-config"] });
      Alert.alert("Saved", "Platform settings updated.");
    },
  });

  if (settingsQuery.isPending) return <LoadingView />;
  if (settingsQuery.isError) return <ErrorBanner message={apiErrorMessage(settingsQuery.error)} onRetry={settingsQuery.refetch} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.sectionTitle}>Firebase client config</Text>
      <Text style={styles.hint}>From Firebase Console → Project settings → General → Your apps (web app config).</Text>
      <FormField label="API key" value={firebaseApiKey} onChangeText={setFirebaseApiKey} autoCapitalize="none" />
      <FormField label="Auth domain" value={firebaseAuthDomain} onChangeText={setFirebaseAuthDomain} autoCapitalize="none" />
      <FormField label="Project ID" value={firebaseProjectId} onChangeText={setFirebaseProjectId} autoCapitalize="none" />
      <FormField label="Storage bucket" value={firebaseStorageBucket} onChangeText={setFirebaseStorageBucket} autoCapitalize="none" />
      <FormField
        label="Messaging sender ID"
        value={firebaseMessagingSenderId}
        onChangeText={setFirebaseMessagingSenderId}
        autoCapitalize="none"
      />
      <FormField label="App ID" value={firebaseAppId} onChangeText={setFirebaseAppId} autoCapitalize="none" />

      <Text style={styles.sectionTitle}>Google Maps</Text>
      <Text style={styles.hint}>Used for the farm-setup location pin preview (Maps Static API).</Text>
      <FormField label="Google Maps API key" value={googleMapsApiKey} onChangeText={setGoogleMapsApiKey} autoCapitalize="none" />

      <Text style={styles.sectionTitle}>Firebase service account (server-only)</Text>
      <Text style={styles.hint}>
        Paste the full JSON from Firebase Console → Project settings → Service accounts → Generate new private key.
        Used server-side to verify phone-OTP tokens at signup — never sent to the app.
      </Text>
      <FormField
        label="Service account JSON"
        value={firebaseServiceAccountJson}
        onChangeText={setFirebaseServiceAccountJson}
        autoCapitalize="none"
        multiline
        numberOfLines={6}
        style={styles.jsonInput}
        placeholder='{"type": "service_account", ...}'
      />

      <PrimaryButton title="Save settings" onPress={() => mutation.mutate()} loading={mutation.isPending} style={styles.saveButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1c2424", marginTop: 12, marginBottom: 4 },
  hint: { fontSize: 12, color: "#7a8787", marginBottom: 10 },
  jsonInput: { minHeight: 120, textAlignVertical: "top" },
  saveButton: { marginTop: 8, marginBottom: 24 },
});
