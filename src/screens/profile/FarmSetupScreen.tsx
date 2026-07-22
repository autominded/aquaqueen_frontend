import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFarm, saveFarm, RacewayDraft } from "../../api/farm";
import { fetchPublicConfig } from "../../api/publicConfig";
import { FarmSystemType } from "../../api/types";
import { API_ORIGIN } from "../../config";
import { staticMapUrl } from "../../lib/staticMap";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { RacewayListEditor } from "../../components/RacewayListEditor";
import { AddressAutocompleteField } from "../../components/AddressAutocompleteField";
import { apiErrorMessage } from "../../api/client";

const SYSTEM_TYPES: FarmSystemType[] = ["RAS", "FLOW_THROUGH"];
const SYSTEM_TYPE_LABEL: Record<FarmSystemType, string> = { RAS: "RAS", FLOW_THROUGH: "Flow-through" };

type FileDraft = { uri: string; name: string; type: string };

function blankRaceway(index: number): RacewayDraft {
  return { name: `Raceway ${index + 1}`, lengthM: "", widthM: "", depthM: "" };
}

export function FarmSetupScreen() {
  const queryClient = useQueryClient();
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });
  const configQuery = useQuery({ queryKey: ["public-config"], queryFn: fetchPublicConfig });

  const [seeded, setSeeded] = useState(false);
  const [racewayCountText, setRacewayCountText] = useState("");
  const [raceways, setRaceways] = useState<RacewayDraft[]>([]);
  const [systemType, setSystemType] = useState<FarmSystemType>("RAS");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [photo, setPhoto] = useState<FileDraft | null>(null);
  const [identityProof, setIdentityProof] = useState<FileDraft | null>(null);
  const [registrationDoc, setRegistrationDoc] = useState<FileDraft | null>(null);
  const [locating, setLocating] = useState(false);

  // Seed once from the fetched farm record.
  useEffect(() => {
    if (seeded || !farmQuery.data) return;
    const farm = farmQuery.data;
    setRacewayCountText(String(farm.raceways.length));
    setRaceways(
      farm.raceways.map((r) => ({
        name: r.name,
        lengthM: String(r.lengthM),
        widthM: String(r.widthM),
        depthM: String(r.depthM),
      }))
    );
    setSystemType(farm.systemType);
    setLatitude(farm.latitude ?? null);
    setLongitude(farm.longitude ?? null);
    setAddress(farm.address ?? "");
    setRegistrationNumber(farm.registrationNumber ?? "");
    setSeeded(true);
  }, [seeded, farmQuery.data]);

  // "Once we enter the raceway number it should expand to each raceway" —
  // resize the raceways array to match as soon as the count changes.
  useEffect(() => {
    const count = Number(racewayCountText);
    if (!Number.isInteger(count) || count < 0) return;
    setRaceways((prev) => {
      if (count === prev.length) return prev;
      if (count < prev.length) return prev.slice(0, count);
      return [...prev, ...Array.from({ length: count - prev.length }, (_, i) => blankRaceway(prev.length + i))];
    });
  }, [racewayCountText]);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission needed", "Location permission is required to capture your farm's coordinates.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    } catch {
      Alert.alert("Error", "Could not get your current location.");
    } finally {
      setLocating(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required to set a farm photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? asset.uri.split("/").pop() ?? "farm-photo.jpg",
      type: asset.mimeType ?? "image/jpeg",
    });
  };

  const pickDocument = async (setter: (file: FileDraft) => void, fallbackName: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setter({
      uri: asset.uri,
      name: asset.name ?? fallbackName,
      type: asset.mimeType ?? "application/octet-stream",
    });
  };

  const mutation = useMutation({
    mutationFn: () =>
      saveFarm({
        systemType,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        address: address.trim() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
        raceways,
        photo: photo ?? undefined,
        identityProof: identityProof ?? undefined,
        registrationDoc: registrationDoc ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farm"] });
      setPhoto(null);
      setIdentityProof(null);
      setRegistrationDoc(null);
      Alert.alert("Saved", "Farm details updated.");
    },
  });

  const [validationError, setValidationError] = useState<string | null>(null);

  const racewaysValid = raceways.every(
    (r) => r.name.trim() && Number(r.lengthM) > 0 && Number(r.widthM) > 0 && Number(r.depthM) > 0
  );

  const onSave = () => {
    setValidationError(null);
    if (!(Number(racewayCountText) > 0)) {
      setValidationError("Enter at least one raceway.");
      return;
    }
    if (!racewaysValid) {
      setValidationError("Fill in a name, length, width, and depth for every raceway.");
      return;
    }
    mutation.mutate();
  };

  if (farmQuery.isPending) return <LoadingView />;
  if (farmQuery.isError) return <ErrorBanner message={apiErrorMessage(farmQuery.error)} onRetry={farmQuery.refetch} />;

  const photoPreviewUri = photo?.uri ?? (farmQuery.data?.photoUrl ? `${API_ORIGIN}${farmQuery.data.photoUrl}` : null);
  const mapUrl =
    latitude != null && longitude != null ? staticMapUrl(latitude, longitude, configQuery.data?.googleMapsApiKey) : null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {validationError && <ErrorBanner message={validationError} />}
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <FormField
        label="Number of raceways"
        value={racewayCountText}
        onChangeText={setRacewayCountText}
        keyboardType="numeric"
        placeholder="6"
      />

      <RacewayListEditor raceways={raceways} onChange={setRaceways} />

      <Text style={styles.label}>System type</Text>
      <View style={styles.systemRow}>
        {SYSTEM_TYPES.map((s) => (
          <PrimaryButton
            key={s}
            title={SYSTEM_TYPE_LABEL[s]}
            variant={systemType === s ? "primary" : "secondary"}
            onPress={() => setSystemType(s)}
            style={styles.systemButton}
          />
        ))}
      </View>

      <AddressAutocompleteField
        value={address}
        onChangeText={setAddress}
        onPlaceSelected={({ latitude: lat, longitude: lng }) => {
          setLatitude(lat);
          setLongitude(lng);
        }}
      />

      <Text style={styles.label}>Location</Text>
      <Card style={styles.locationCard}>
        <Text style={styles.meta}>
          {latitude != null && longitude != null ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : "Not set"}
        </Text>
        <PrimaryButton
          title="Use current location"
          variant="secondary"
          onPress={useCurrentLocation}
          loading={locating}
          style={styles.locationButton}
        />
        {mapUrl && <Image source={{ uri: mapUrl }} style={styles.mapPreview} />}
        {latitude != null && longitude != null && !mapUrl && (
          <Text style={styles.mapUnavailable}>Map preview needs a Google Maps API key (set by a super admin).</Text>
        )}
      </Card>

      <Text style={styles.label}>Farm photo</Text>
      <TouchableOpacity onPress={pickPhoto}>
        <Card style={styles.photoCard}>
          {photoPreviewUri ? (
            <Image source={{ uri: photoPreviewUri }} style={styles.photo} />
          ) : (
            <Text style={styles.meta}>Tap to choose a photo</Text>
          )}
        </Card>
      </TouchableOpacity>

      <FormField
        label="Farm registration number"
        value={registrationNumber}
        onChangeText={setRegistrationNumber}
        placeholder="REG-2026-001"
      />

      <Text style={styles.label}>Identity proof</Text>
      <TouchableOpacity onPress={() => pickDocument(setIdentityProof, "identity-proof")}>
        <Card style={styles.docCard}>
          <Text style={styles.meta}>
            {identityProof?.name ?? (farmQuery.data?.identityProofUrl ? "Uploaded — tap to replace" : "Tap to upload (photo or PDF)")}
          </Text>
        </Card>
      </TouchableOpacity>

      <Text style={styles.label}>Farm registration document</Text>
      <TouchableOpacity onPress={() => pickDocument(setRegistrationDoc, "registration-doc")}>
        <Card style={styles.docCard}>
          <Text style={styles.meta}>
            {registrationDoc?.name ?? (farmQuery.data?.registrationDocUrl ? "Uploaded — tap to replace" : "Tap to upload (photo or PDF)")}
          </Text>
        </Card>
      </TouchableOpacity>

      <PrimaryButton title="Save farm details" onPress={onSave} loading={mutation.isPending} style={styles.saveButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  meta: { fontSize: 13, color: "#7a8787" },
  systemRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  systemButton: { flex: 1 },
  locationCard: { marginHorizontal: 0 },
  locationButton: { marginTop: 10 },
  mapPreview: { width: "100%", height: 160, borderRadius: 8, marginTop: 12 },
  mapUnavailable: { fontSize: 12, color: "#9aa5a5", marginTop: 8 },
  photoCard: { marginHorizontal: 0, alignItems: "center" },
  photo: { width: "100%", height: 180, borderRadius: 8 },
  docCard: { marginHorizontal: 0 },
  saveButton: { marginTop: 8 },
});
