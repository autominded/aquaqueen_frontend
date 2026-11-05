import React, { useEffect, useRef, useState } from "react";
import { findNodeHandle, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { notify } from "../../lib/notify";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchFarm, saveFarm, FarmFileDraft, RacewayDraft } from "../../api/farm";
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
import { AppIcon } from "../../components/AppIcon";
import { useRefreshing } from "../../lib/useRefreshing";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { colors, radii } from "../../theme";
import { useUnits, LENGTH_PER_METRE } from "../../context/UnitsContext";
import { ProfileStackParamList, AppTabParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<ProfileStackParamList, "FarmSetup">;

// Flow-through is the more common setup for trout farms, so it's the default
// for a brand-new farm and listed first — RAS is the exception, not the norm.
const SYSTEM_TYPES: FarmSystemType[] = ["FLOW_THROUGH", "RAS"];
const SYSTEM_TYPE_LABEL: Record<FarmSystemType, string> = { RAS: "RAS", FLOW_THROUGH: "Flow-through" };

function blankRaceway(index: number): RacewayDraft {
  return { name: `Raceway ${index + 1}`, lengthM: "", widthM: "", depthM: "" };
}

export function FarmSetupScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });
  const configQuery = useQuery({ queryKey: ["public-config"], queryFn: fetchPublicConfig });
  const { lengthUnitLabel, toDisplayLength, fromDisplayLength } = useUnits();
  const { refreshing, onRefresh } = useRefreshing();

  const [seeded, setSeeded] = useState(false);
  const [racewayCountText, setRacewayCountText] = useState("");
  const [raceways, setRaceways] = useState<RacewayDraft[]>([]);
  const [systemType, setSystemType] = useState<FarmSystemType>("FLOW_THROUGH");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [photo, setPhoto] = useState<FarmFileDraft | null>(null);
  const [logo, setLogo] = useState<FarmFileDraft | null>(null);
  const [identityProof, setIdentityProof] = useState<FarmFileDraft | null>(null);
  const [registrationDoc, setRegistrationDoc] = useState<FarmFileDraft | null>(null);
  const [locating, setLocating] = useState(false);

  const adjustRacewayCount = (delta: number) => {
    const current = Number(racewayCountText) || 0;
    setRacewayCountText(String(Math.max(0, current + delta)));
  };

  // Seed once from the fetched farm record — or, for a brand-new org with no
  // Farm row yet, just mark seeding done without touching anything. Must
  // land before the raceway-count effect below is allowed to touch
  // `raceways`: on first mount both effects fire in the same pass, and if
  // the count effect ran unguarded it would see the pre-seed "" (=> 0) count
  // and truncate the array this effect just populated with real data down
  // to nothing, before the second render even reflects the real count.
  useEffect(() => {
    if (seeded || farmQuery.data === undefined) return;
    const farm = farmQuery.data;
    if (farm) {
      setRacewayCountText(String(farm.raceways.length));
      setRaceways(
        farm.raceways.map((r) => ({
          id: r.id,
          name: r.name,
          lengthM: String(toDisplayLength(r.lengthM)),
          widthM: String(toDisplayLength(r.widthM)),
          depthM: String(toDisplayLength(r.depthM)),
        }))
      );
      setSystemType(farm.systemType);
      setLatitude(farm.latitude ?? null);
      setLongitude(farm.longitude ?? null);
      setAddress(farm.address ?? "");
      setRegistrationNumber(farm.registrationNumber ?? "");
    }
    setSeeded(true);
  }, [seeded, farmQuery.data]);

  // "Once we enter the raceway number it should expand to each raceway" —
  // resize the raceways array to match as soon as the count changes. Gated
  // on `seeded` so this can't run before the seed effect above has had a
  // chance to populate real data (see comment there).
  useEffect(() => {
    if (!seeded) return;
    const count = Number(racewayCountText);
    if (!Number.isInteger(count) || count < 0) return;
    setRaceways((prev) => {
      if (count === prev.length) return prev;
      if (count < prev.length) return prev.slice(0, count);
      return [...prev, ...Array.from({ length: count - prev.length }, (_, i) => blankRaceway(prev.length + i))];
    });
  }, [racewayCountText, seeded]);

  // Display units live on this same screen now, above the raceway fields —
  // switching them mid-edit must convert the numbers already typed, not just
  // relabel them (10 stays 10 when the label silently flips from m to ft is
  // wrong; it should become ~32.8). toDisplayLength/fromDisplayLength are
  // both keyed off the *current* unit, so converting old-unit -> new-unit
  // needs the previous unit captured before it changes, not those helpers.
  const prevLengthUnitRef = useRef(lengthUnitLabel);
  useEffect(() => {
    const prevUnit = prevLengthUnitRef.current;
    if (prevUnit !== lengthUnitLabel) {
      const metresPerPrevUnit = 1 / LENGTH_PER_METRE[prevUnit];
      const metresPerNewUnit = 1 / LENGTH_PER_METRE[lengthUnitLabel];
      const convert = (value: string) => {
        if (value.trim() === "") return value;
        const num = Number(value);
        if (!Number.isFinite(num)) return value;
        return String((num * metresPerPrevUnit) / metresPerNewUnit);
      };
      setRaceways((prev) => prev.map((r) => ({ ...r, lengthM: convert(r.lengthM), widthM: convert(r.widthM), depthM: convert(r.depthM) })));
    }
    prevLengthUnitRef.current = lengthUnitLabel;
  }, [lengthUnitLabel]);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        notify("Permission needed", "Location permission is required to capture your farm's coordinates.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
    } catch {
      notify("Error", "Could not get your current location.");
    } finally {
      setLocating(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      notify("Permission needed", "Photo library access is required to set a farm photo.");
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
      file: asset.file,
    });
  };

  // Optional, unlike the mandatory farm photo above — a brand mark shown on
  // the dashboard header instead of a literal site photo.
  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      notify("Permission needed", "Photo library access is required to set a farm logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      // Square, matching Play Store's own app-icon guidance (512x512) — iOS
      // crops to a square regardless, this only matters for Android.
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setLogo({
      uri: asset.uri,
      name: asset.fileName ?? asset.uri.split("/").pop() ?? "farm-logo.jpg",
      type: asset.mimeType ?? "image/jpeg",
      file: asset.file,
    });
  };

  const pickDocument = async (setter: (file: FarmFileDraft) => void, fallbackName: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      base64: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setter({
      uri: asset.uri,
      name: asset.name ?? fallbackName,
      type: asset.mimeType ?? "application/octet-stream",
      file: asset.file,
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
        raceways: raceways.map((r) => ({
          ...r,
          lengthM: String(fromDisplayLength(Number(r.lengthM))),
          widthM: String(fromDisplayLength(Number(r.widthM))),
          depthM: String(fromDisplayLength(Number(r.depthM))),
        })),
        photo: photo ?? undefined,
        logo: logo ?? undefined,
        identityProof: identityProof ?? undefined,
        registrationDoc: registrationDoc ?? undefined,
      }),
    onSuccess: (farm) => {
      // Re-seed raceways from the server's response rather than waiting on a
      // refetch — the seed effect above only runs once (guarded by `seeded`),
      // so without this, a newly-created raceway's real id never makes it
      // into local state. The next save would then resend it without an id,
      // and the server would read that as "remove this raceway", tripping
      // the active-stocking guard the moment it's actually in use.
      setRaceways(
        farm.raceways.map((r) => ({
          id: r.id,
          name: r.name,
          lengthM: String(toDisplayLength(r.lengthM)),
          widthM: String(toDisplayLength(r.widthM)),
          depthM: String(toDisplayLength(r.depthM)),
        }))
      );
      setRacewayCountText(String(farm.raceways.length));
      queryClient.invalidateQueries({ queryKey: ["farm"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setPhoto(null);
      setLogo(null);
      setIdentityProof(null);
      setRegistrationDoc(null);
      notify("Saved", "Farm details updated.");
      navigation.getParent<BottomTabNavigationProp<AppTabParamList>>()?.navigate("Dashboard");
    },
    onError: () => scrollToSection(null),
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [invalidSection, setInvalidSection] = useState<"raceways" | "location" | "photo" | "identityProof" | "registrationDoc" | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const racewaySectionRef = useRef<View>(null);
  const locationSectionRef = useRef<View>(null);
  const photoSectionRef = useRef<View>(null);
  const identityProofSectionRef = useRef<View>(null);
  const registrationDocSectionRef = useRef<View>(null);

  const sectionRefs = {
    raceways: racewaySectionRef,
    location: locationSectionRef,
    photo: photoSectionRef,
    identityProof: identityProofSectionRef,
    registrationDoc: registrationDocSectionRef,
  } as const;

  // Scrolls the failing section into view rather than leaving the user to
  // hunt through the form for whatever the top error banner is referring to.
  // `null` (a server-side error with no single field to blame) just scrolls
  // back to the top, where the banner already renders.
  const scrollToSection = (section: keyof typeof sectionRefs | null) => {
    setInvalidSection(section);
    if (!section) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    // findNodeHandle() throws on web ("not supported") — it was crashing the
    // save flow the moment any validation error tried to scroll to it. The
    // top error banner already surfaces the message there, so just skip the
    // scroll-into-view on web rather than fighting react-native-web's
    // differently-typed measureLayout target.
    if (Platform.OS === "web") return;
    const node = sectionRefs[section].current;
    const scrollNode = scrollRef.current ? findNodeHandle(scrollRef.current) : null;
    if (node && scrollNode) {
      node.measureLayout(
        scrollNode,
        (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true }),
        () => {}
      );
    }
  };

  const racewaysValid = raceways.every(
    (r) => r.name.trim() && Number(r.lengthM) > 0 && Number(r.widthM) > 0 && Number(r.depthM) > 0
  );

  const onSave = () => {
    setValidationError(null);
    setInvalidSection(null);
    if (!(Number(racewayCountText) > 0) || !racewaysValid) {
      setValidationError(
        !(Number(racewayCountText) > 0) ? "Enter at least one raceway." : "Fill in a name, length, width, and depth for every raceway."
      );
      scrollToSection("raceways");
      return;
    }
    if (latitude == null || longitude == null) {
      setValidationError("Set the farm's location before saving.");
      scrollToSection("location");
      return;
    }
    if (!photo && !farmQuery.data?.photoUrl) {
      setValidationError("Add a farm photo before saving.");
      scrollToSection("photo");
      return;
    }
    if (!identityProof && !farmQuery.data?.identityProofUrl) {
      setValidationError("Upload a farm identity proof before saving.");
      scrollToSection("identityProof");
      return;
    }
    if (!registrationDoc && !farmQuery.data?.registrationDocUrl) {
      setValidationError("Upload the farm registration document before saving.");
      scrollToSection("registrationDoc");
      return;
    }
    mutation.mutate();
  };

  if (farmQuery.isPending) return <LoadingView />;
  if (farmQuery.isError) return <ErrorBanner message={apiErrorMessage(farmQuery.error)} onRetry={farmQuery.refetch} />;

  const photoPreviewUri = photo?.uri ?? (farmQuery.data?.photoUrl ? `${API_ORIGIN}${farmQuery.data.photoUrl}` : null);
  const logoPreviewUri = logo?.uri ?? (farmQuery.data?.logoUrl ? `${API_ORIGIN}${farmQuery.data.logoUrl}` : null);
  const mapUrl =
    latitude != null && longitude != null ? staticMapUrl(latitude, longitude, configQuery.data?.googleMapsApiKey) : null;

  return (
    <RefreshableScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}><View><Text style={styles.eyebrow}>FARM DIGITAL TWIN</Text><Text style={styles.heroTitle}>Define your operation.</Text><Text style={styles.heroText}>Map the physical farm that powers every production record.</Text></View><AppIcon name="map" size={28} color="#D5E8E5" /></View>
      {validationError && <ErrorBanner message={validationError} />}
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <View ref={racewaySectionRef} style={invalidSection === "raceways" && styles.sectionInvalid}>
        <Text style={styles.sectionTitle}>Production layout</Text>
        <Text style={styles.label}>Number of raceways</Text>
        <View style={styles.racewayStepper}>
          <TouchableOpacity style={styles.stepperButton} onPress={() => adjustRacewayCount(-1)} disabled={(Number(racewayCountText) || 0) <= 0} accessibilityLabel="Remove a raceway"><AppIcon name="minus" size={20} color={colors.teal} /></TouchableOpacity>
          <View style={styles.stepperValue}><Text style={styles.stepperNumber}>{Number(racewayCountText) || 0}</Text><Text style={styles.stepperHint}>raceways</Text></View>
          <TouchableOpacity style={[styles.stepperButton, styles.stepperButtonAdd]} onPress={() => adjustRacewayCount(1)} accessibilityLabel="Add a raceway"><AppIcon name="plus" size={20} color={colors.white} /></TouchableOpacity>
        </View>

        <RacewayListEditor raceways={raceways} onChange={setRaceways} lengthUnitLabel={lengthUnitLabel} />
      </View>

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

      <View ref={locationSectionRef} style={invalidSection === "location" && styles.sectionInvalid}>
        <Text style={styles.sectionTitle}>Farm location</Text>
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
      </View>

      <Text style={styles.sectionTitle}>Farm identity</Text>
      <View ref={photoSectionRef} style={invalidSection === "photo" && styles.sectionInvalid}>
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
      </View>

      <View>
        <Text style={styles.label}>Farm logo (optional)</Text>
        <Text style={styles.hint}>Shown on the dashboard header instead of the farm photo.</Text>
        <TouchableOpacity onPress={pickLogo}>
          <Card style={styles.photoCard}>
            {logoPreviewUri ? (
              <Image source={{ uri: logoPreviewUri }} style={styles.logo} />
            ) : (
              <Text style={styles.meta}>Tap to choose a logo</Text>
            )}
          </Card>
        </TouchableOpacity>
      </View>

      <FormField
        label="Farm registration number"
        value={registrationNumber}
        onChangeText={setRegistrationNumber}
        placeholder="REG-2026-001"
      />

      <View ref={identityProofSectionRef} style={invalidSection === "identityProof" && styles.sectionInvalid}>
        <Text style={styles.label}>Identity proof</Text>
        <TouchableOpacity onPress={() => pickDocument(setIdentityProof, "identity-proof")}>
          <Card style={styles.docCard}>
            <Text style={styles.meta}>
              {identityProof?.name ?? (farmQuery.data?.identityProofUrl ? "Uploaded — tap to replace" : "Tap to upload (photo or PDF)")}
            </Text>
          </Card>
        </TouchableOpacity>
      </View>

      <View ref={registrationDocSectionRef} style={invalidSection === "registrationDoc" && styles.sectionInvalid}>
        <Text style={styles.label}>Farm registration document</Text>
        <TouchableOpacity onPress={() => pickDocument(setRegistrationDoc, "registration-doc")}>
          <Card style={styles.docCard}>
            <Text style={styles.meta}>
              {registrationDoc?.name ?? (farmQuery.data?.registrationDocUrl ? "Uploaded — tap to replace" : "Tap to upload (photo or PDF)")}
            </Text>
          </Card>
        </TouchableOpacity>
      </View>

      <PrimaryButton title="Save farm details" onPress={onSave} loading={mutation.isPending} style={styles.saveButton} />
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 }, hero: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20, flexDirection: "row", justifyContent: "space-between", marginBottom: 24 }, eyebrow: { fontSize: 11, color: "#BBD9D5", fontWeight: "800", letterSpacing: 1 }, heroTitle: { color: colors.white, fontSize: 24, fontWeight: "800", marginTop: 5 }, heroText: { color: "#D5E8E5", fontSize: 13, lineHeight: 18, marginTop: 5, maxWidth: 255 }, sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ocean, marginTop: 12, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 }, meta: { fontSize: 13, color: colors.inkMuted },
  hint: { fontSize: 12, color: colors.inkMuted, marginTop: -3, marginBottom: 8 },
  racewayStepper: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }, stepperButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.teal }, stepperButtonAdd: { backgroundColor: colors.teal }, stepperValue: { minWidth: 90, alignItems: "center" }, stepperNumber: { color: colors.ocean, fontSize: 24, fontWeight: "800" }, stepperHint: { color: colors.inkMuted, fontSize: 12, marginTop: 1 },
  systemRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  systemButton: { flex: 1 },
  locationCard: { marginHorizontal: 0 },
  locationButton: { marginTop: 10 },
  mapPreview: { width: "100%", height: 160, borderRadius: radii.sm, marginTop: 12 }, mapUnavailable: { fontSize: 12, color: colors.inkMuted, marginTop: 8 },
  photoCard: { marginHorizontal: 0, alignItems: "center" },
  photo: { width: "100%", height: 180, borderRadius: radii.sm },
  logo: { width: 120, height: 120, borderRadius: radii.sm },
  docCard: { marginHorizontal: 0 },
  saveButton: { marginTop: 8 },
  sectionInvalid: { borderWidth: 2, borderColor: colors.coral, borderRadius: radii.lg, padding: 8, margin: -8 },
});
