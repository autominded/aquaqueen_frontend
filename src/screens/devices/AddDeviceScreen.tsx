import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BatchesStackParamList } from "../../navigation/types";
import { claimDevice, updateDevice } from "../../api/devices";
import { fetchDashboardRaceways } from "../../api/dashboard";
import { apiErrorMessage } from "../../api/client";
import * as provisioning from "../../lib/espProvisioning";
import { FAILURE_COPY, ProvisioningError, WifiNetwork } from "../../lib/espProvisioningTypes";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { FormField } from "../../components/FormField";
import { SelectField } from "../../components/SelectField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Device } from "../../api/types";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "AddDevice">;

/**
 * The order here is deliberate and worth explaining.
 *
 * The claim happens *before* Bluetooth, not after. Two reasons: it validates
 * the code against the server in a second, so a misread QR fails immediately
 * instead of after a minute of Bluetooth pairing; and once claimed, the
 * farmer owns the hardware even if Wi-Fi setup goes wrong, so a retry starts
 * from "connect this device to Wi-Fi" rather than from the beginning.
 *
 * The device doesn't care about the order — its bootstrap and this claim are
 * two halves that rendezvous either way (see D:\iot\docs\PROVISIONING.md).
 */
type Step =
  | "scan"
  | "claiming"
  | "connecting"
  | "network"
  | "password"
  | "provisioning"
  | "assign"
  | "done";

const STEP_PROGRESS: Record<Step, { index: number; label: string }> = {
  scan: { index: 0, label: "Scan the device" },
  claiming: { index: 1, label: "Checking the code" },
  connecting: { index: 1, label: "Connecting" },
  network: { index: 2, label: "Choose Wi-Fi" },
  password: { index: 2, label: "Choose Wi-Fi" },
  provisioning: { index: 3, label: "Connecting to Wi-Fi" },
  assign: { index: 4, label: "Name it" },
  done: { index: 4, label: "Done" },
};

const TOTAL_STEPS = 5;

interface ScannedDevice {
  deviceId: string;
  claimCode: string;
}

/**
 * Parses the QR payload written by tools/provision.py.
 *
 * Returns null rather than throwing, because a farmer pointing a camera at a
 * raceway sweeps across all sorts of barcodes and none of them are errors —
 * they're just not ours.
 */
function parseQr(raw: string): ScannedDevice | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v === 1 && typeof parsed.id === "string" && typeof parsed.code === "string") {
      return { deviceId: parsed.id, claimCode: parsed.code };
    }
  } catch {
    // Not JSON. Fall through — some label printers encode the bare code.
  }
  if (/^AQ-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(raw.trim())) {
    return { deviceId: "", claimCode: raw.trim().toUpperCase() };
  }
  return null;
}

function signalBars(rssi: number): string {
  if (rssi >= -55) return "Strong";
  if (rssi >= -70) return "Good";
  if (rssi >= -80) return "Weak";
  return "Very weak";
}

export function AddDeviceScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();

  const [step, setStep] = useState<Step>("scan");
  const [scanned, setScanned] = useState<ScannedDevice | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  const [device, setDevice] = useState<Device | null>(null);
  const [bleName, setBleName] = useState<string | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<WifiNetwork | null>(null);
  const [password, setPassword] = useState("");

  const [deviceName, setDeviceName] = useState("");
  const [racewayId, setRacewayId] = useState<string | undefined>();

  const [error, setError] = useState<{ title: string; detail: string; retryTo: Step } | null>(null);

  // The camera fires onBarcodeScanned continuously while a code is in frame —
  // several times a second. Without this guard the claim mutation would be
  // dispatched dozens of times for one sticker.
  const handledScan = useRef(false);

  const racewaysQuery = useQuery({ queryKey: ["dashboard-raceways"], queryFn: fetchDashboardRaceways });

  /**
   * Always close the BLE session when leaving.
   *
   * The firmware releases its Bluetooth stack after a successful provision
   * and cannot accept a second session without rebooting, so a session left
   * open here makes the *next* device appear unresponsive.
   */
  useEffect(() => () => provisioning.disconnect(), []);

  const fail = useCallback((err: unknown, retryTo: Step) => {
    if (err instanceof ProvisioningError) {
      setError({ ...FAILURE_COPY[err.reason], retryTo });
    } else {
      setError({ title: "Something went wrong", detail: apiErrorMessage(err), retryTo });
    }
  }, []);

  // ── Bluetooth ────────────────────────────────────────────────────────
  // Declared before the claim mutation that calls it: `const` bindings are in
  // the temporal dead zone until evaluated, and while the callback would only
  // run later, TypeScript flags the forward reference.
  const beginProvisioning = useCallback(
    async (target: ScannedDevice) => {
      setStep("connecting");
      setError(null);

      try {
        const name = await provisioning.findDevice(target.deviceId || target.claimCode);
        setBleName(name);

        // The claim code doubles as the proof of possession — holding the box
        // is the authorisation. See D:\iot\docs\PROVISIONING.md.
        await provisioning.connect(name, target.claimCode);

        const found = await provisioning.scanNetworks();
        setNetworks(found);
        setStep("network");
      } catch (err) {
        fail(err, "connecting");
      }
    },
    [fail]
  );

  // ── Claim ────────────────────────────────────────────────────────────
  const claimMutation = useMutation({
    mutationFn: (input: ScannedDevice) => claimDevice({ claimCode: input.claimCode }),
    onSuccess: (claimed, input) => {
      setDevice(claimed);
      setDeviceName(claimed.name);
      queryClient.invalidateQueries({ queryKey: ["devices"] });

      if (!provisioning.isSupported) {
        // Web: the device is claimed and will appear in the list, but Wi-Fi
        // setup needs the phone. Say so and stop rather than dead-ending.
        setError({ ...FAILURE_COPY.unsupportedPlatform, retryTo: "assign" });
        setStep("assign");
        return;
      }
      // `input`, not the `scanned` state — setScanned hasn't committed yet
      // when this fires, so reading state here would pass undefined.
      void beginProvisioning(input);
    },
    onError: (err) => {
      handledScan.current = false;
      fail(err, "scan");
      setStep("scan");
    },
  });

  // ── Wi-Fi ────────────────────────────────────────────────────────────
  // Takes the network explicitly rather than reading `selectedNetwork`: an
  // open network skips the password screen and calls this in the same tick as
  // setSelectedNetwork, when that state has not yet updated.
  const submitCredentials = useCallback(
    async (network: WifiNetwork, passphrase: string) => {
      setStep("provisioning");
      setError(null);

      try {
        await provisioning.provision(network.ssid, passphrase);
        provisioning.disconnect();
        setStep("assign");
      } catch (err) {
        fail(err, "network");
      }
    },
    [fail]
  );

  // ── Naming ───────────────────────────────────────────────────────────
  const finishMutation = useMutation({
    mutationFn: () => {
      if (!device) throw new Error("No device to update");
      return updateDevice(device.id, {
        name: deviceName.trim() || device.name,
        racewayId: racewayId ?? null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setStep("done");
    },
    onError: (err) => fail(err, "assign"),
  });

  const handleScan = useCallback(
    (raw: string) => {
      if (handledScan.current) return;

      const parsed = parseQr(raw);
      if (!parsed) return; // Not one of ours — keep scanning silently.

      handledScan.current = true;
      setScanned(parsed);
      setError(null);
      setStep("claiming");
      claimMutation.mutate(parsed);
    },
    [claimMutation]
  );

  const retry = useCallback(() => {
    const target = error?.retryTo ?? "scan";
    setError(null);

    if (target === "scan") {
      handledScan.current = false;
      setScanned(null);
      provisioning.disconnect();
      setStep("scan");
    } else if (target === "connecting" && scanned) {
      // Reconnecting starts a fresh BLE session; the old one may be half-open
      // after a failure and would block the new one.
      provisioning.disconnect();
      void beginProvisioning(scanned);
    } else if (target === "network") {
      setStep("network");
    } else {
      setStep(target);
    }
  }, [error, scanned, beginProvisioning]);

  // ── Render ───────────────────────────────────────────────────────────

  const progress = STEP_PROGRESS[step];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressSegment,
              index <= progress.index ? styles.progressSegmentDone : null,
            ]}
          />
        ))}
      </View>
      <Text style={styles.progressLabel}>{progress.label}</Text>

      {error && (
        <Card style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <AppIcon name="alert-circle" size={18} color={colors.coral} />
          </View>
          <View style={styles.errorCopy}>
            <Text style={styles.errorTitle}>{error.title}</Text>
            <Text style={styles.errorDetail}>{error.detail}</Text>
          </View>
        </Card>
      )}

      {step === "scan" && (
        <ScanStep
          permission={permission}
          requestPermission={requestPermission}
          onScan={handleScan}
          showManualEntry={showManualEntry}
          setShowManualEntry={setShowManualEntry}
          manualCode={manualCode}
          setManualCode={setManualCode}
          onManualSubmit={() => {
            const parsed = parseQr(manualCode);
            if (!parsed) {
              setError({
                title: "That code doesn't look right",
                detail: "Setup codes look like AQ-7K4M-92XB. Check the sticker on the device.",
                retryTo: "scan",
              });
              return;
            }
            handleScan(manualCode);
          }}
          error={!!error}
          onRetry={retry}
        />
      )}

      {(step === "claiming" || step === "connecting" || step === "provisioning") && (
        <BusyStep
          step={step}
          bleName={bleName}
          ssid={selectedNetwork?.ssid}
          error={error}
          onRetry={retry}
          onStartOver={() => {
            handledScan.current = false;
            setScanned(null);
            provisioning.disconnect();
            setError(null);
            setStep("scan");
          }}
        />
      )}

      {step === "network" && (
        <NetworkStep
          networks={networks}
          onSelect={(network) => {
            setSelectedNetwork(network);
            setPassword("");
            if (network.secured) {
              setStep("password");
            } else {
              // Open network — nothing to type, so go straight through.
              void submitCredentials(network, "");
            }
          }}
          onRescan={() => scanned && void beginProvisioning(scanned)}
        />
      )}

      {step === "password" && selectedNetwork && (
        <PasswordStep
          network={selectedNetwork}
          password={password}
          setPassword={setPassword}
          onBack={() => setStep("network")}
          onSubmit={() => void submitCredentials(selectedNetwork, password)}
        />
      )}

      {step === "assign" && device && (
        <AssignStep
          device={device}
          name={deviceName}
          setName={setDeviceName}
          racewayId={racewayId}
          setRacewayId={setRacewayId}
          raceways={racewaysQuery.data ?? []}
          saving={finishMutation.isPending}
          onSave={() => finishMutation.mutate()}
        />
      )}

      {step === "done" && device && (
        <DoneStep
          device={device}
          onViewDevice={() => navigation.replace("DeviceDetail", { deviceId: device.id })}
          onAddAnother={() => {
            handledScan.current = false;
            setScanned(null);
            setDevice(null);
            setBleName(null);
            setNetworks([]);
            setSelectedNetwork(null);
            setPassword("");
            setDeviceName("");
            setRacewayId(undefined);
            setError(null);
            setStep("scan");
          }}
        />
      )}
    </ScrollView>
  );
}

/* ─────────────────────────────────────────────────────────── scan step */

function ScanStep({
  permission,
  requestPermission,
  onScan,
  showManualEntry,
  setShowManualEntry,
  manualCode,
  setManualCode,
  onManualSubmit,
  error,
  onRetry,
}: {
  permission: ReturnType<typeof useCameraPermissions>[0];
  requestPermission: ReturnType<typeof useCameraPermissions>[1];
  onScan: (raw: string) => void;
  showManualEntry: boolean;
  setShowManualEntry: (value: boolean) => void;
  manualCode: string;
  setManualCode: (value: string) => void;
  onManualSubmit: () => void;
  error: boolean;
  onRetry: () => void;
}) {
  if (showManualEntry) {
    return (
      <Card style={styles.stepCard}>
        <Text style={styles.stepTitle}>Type the setup code</Text>
        <Text style={styles.stepBody}>
          It's printed under the QR code on the device, and looks like AQ-7K4M-92XB.
        </Text>
        <FormField
          label="Setup code"
          value={manualCode}
          onChangeText={(text) => setManualCode(text.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="AQ-XXXX-XXXX"
        />
        <PrimaryButton title="Continue" onPress={onManualSubmit} />
        <PrimaryButton title="Scan instead" variant="ghost" onPress={() => setShowManualEntry(false)} />
      </Card>
    );
  }

  if (!permission) {
    return (
      <Card style={styles.stepCard}>
        <ActivityIndicator color={colors.teal} />
      </Card>
    );
  }

  if (!permission.granted) {
    return (
      <Card style={styles.stepCard}>
        <Text style={styles.stepTitle}>Camera access needed</Text>
        <Text style={styles.stepBody}>
          Point the camera at the QR sticker on the device to set it up. Nothing is recorded — the camera is
          only used to read the code.
        </Text>
        <PrimaryButton title="Allow camera" onPress={requestPermission} />
        <PrimaryButton title="Type the code instead" variant="ghost" onPress={() => setShowManualEntry(true)} />
      </Card>
    );
  }

  return (
    <>
      <View style={styles.cameraFrame}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={({ data }) => onScan(data)}
        />
        <View style={styles.reticle} pointerEvents="none" />
      </View>

      <Text style={styles.cameraHint}>
        Point at the QR sticker on the device. Make sure it's plugged in and its light is blinking.
      </Text>

      {error && <PrimaryButton title="Try again" onPress={onRetry} />}
      <PrimaryButton title="Type the code instead" variant="ghost" onPress={() => setShowManualEntry(true)} />
    </>
  );
}

/* ───────────────────────────────────────────────────────── busy steps */

function BusyStep({
  step,
  bleName,
  ssid,
  error,
  onRetry,
  onStartOver,
}: {
  step: Step;
  bleName: string | null;
  ssid?: string;
  error: { title: string; detail: string } | null;
  onRetry: () => void;
  onStartOver: () => void;
}) {
  const copy: Record<string, { title: string; body: string }> = {
    claiming: {
      title: "Checking the code",
      body: "Making sure this device isn't already set up somewhere else.",
    },
    connecting: {
      title: "Looking for the device",
      body: bleName
        ? `Talking to ${bleName} over Bluetooth.`
        : "Searching over Bluetooth. Stay within a few metres of it.",
    },
    provisioning: {
      title: "Joining your Wi-Fi",
      body: ssid
        ? `Handing the device your ${ssid} details. This takes about twenty seconds.`
        : "This takes about twenty seconds.",
    },
  };

  const current = copy[step];

  if (error) {
    return (
      <Card style={styles.stepCard}>
        <PrimaryButton title="Try again" onPress={onRetry} />
        <PrimaryButton title="Start over" variant="ghost" onPress={onStartOver} />
      </Card>
    );
  }

  return (
    <Card style={styles.stepCard}>
      <ActivityIndicator size="large" color={colors.teal} style={styles.busySpinner} />
      <Text style={styles.stepTitle}>{current.title}</Text>
      <Text style={styles.stepBody}>{current.body}</Text>
    </Card>
  );
}

/* ────────────────────────────────────────────────────────── wifi step */

function NetworkStep({
  networks,
  onSelect,
  onRescan,
}: {
  networks: WifiNetwork[];
  onSelect: (network: WifiNetwork) => void;
  onRescan: () => void;
}) {
  return (
    <>
      <Card style={styles.stepCard}>
        <Text style={styles.stepTitle}>Choose your Wi-Fi</Text>
        {/*
          These are the networks the DEVICE can see, not the phone. On a
          dual-band router those lists differ — the device has no 5 GHz radio —
          and offering the phone's list is how a farmer picks a network the
          device can never join.
        */}
        <Text style={styles.stepBody}>
          These are the networks the device can reach. FarmFin devices only work on 2.4 GHz Wi-Fi, so your
          5 GHz network won't appear here even if your phone is on it.
        </Text>
      </Card>

      {networks.length === 0 && (
        <Card style={styles.stepCard}>
          <Text style={styles.stepTitle}>No networks found</Text>
          <Text style={styles.stepBody}>
            The device couldn't see any 2.4 GHz networks from where it is. Move it closer to the router, or
            check that 2.4 GHz is switched on.
          </Text>
          <PrimaryButton title="Scan again" onPress={onRescan} />
        </Card>
      )}

      {networks.map((network) => (
        <TouchableOpacity key={network.ssid} onPress={() => onSelect(network)}>
          <Card style={styles.networkCard}>
            <AppIcon name="wifi" size={18} color={colors.teal} />
            <View style={styles.networkCopy}>
              <Text style={styles.networkSsid}>{network.ssid}</Text>
              <Text style={styles.networkMeta}>
                {signalBars(network.rssi)}
                {network.secured ? " · Password needed" : " · Open"}
              </Text>
            </View>
            <AppIcon name="chevron-right" />
          </Card>
        </TouchableOpacity>
      ))}

      {networks.length > 0 && <PrimaryButton title="Scan again" variant="ghost" onPress={onRescan} />}
    </>
  );
}

function PasswordStep({
  network,
  password,
  setPassword,
  onBack,
  onSubmit,
}: {
  network: WifiNetwork;
  password: string;
  setPassword: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card style={styles.stepCard}>
      <Text style={styles.stepTitle}>Password for {network.ssid}</Text>
      <Text style={styles.stepBody}>This is sent to the device over an encrypted Bluetooth link.</Text>
      <FormField
        label="Wi-Fi password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />
      {/* WPA2 has an 8-character minimum, so anything shorter is a typo. */}
      <PrimaryButton title="Connect" onPress={onSubmit} disabled={password.length < 8} />
      <PrimaryButton title="Pick a different network" variant="ghost" onPress={onBack} />
    </Card>
  );
}

/* ──────────────────────────────────────────────────────── assign step */

function AssignStep({
  device,
  name,
  setName,
  racewayId,
  setRacewayId,
  raceways,
  saving,
  onSave,
}: {
  device: Device;
  name: string;
  setName: (value: string) => void;
  racewayId?: string;
  setRacewayId: (value: string) => void;
  raceways: { id: string; name: string }[];
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <Card style={styles.stepCard}>
      <View style={styles.successBadge}>
        <AppIcon name="check" size={20} color={colors.success} />
      </View>
      <Text style={styles.stepTitle}>Device connected</Text>
      <Text style={styles.stepBody}>
        Give it a name and tell FarmFin which raceway it's watching. You can change both later.
      </Text>

      <FormField label="Name" value={name} onChangeText={setName} placeholder={device.name} />

      <SelectField
        label="Raceway"
        value={racewayId}
        options={raceways.map((raceway) => ({ label: raceway.name, value: raceway.id }))}
        onSelect={setRacewayId}
        placeholder="Not assigned yet"
      />

      {/*
        Unassigned is a real, supported state, not an error. The device still
        records and charts everything — it just can't join those readings to a
        raceway's water quality history until it knows where it is.
      */}
      {!racewayId && (
        <Text style={styles.hint}>
          Without a raceway, readings still show on the device's own screen but won't appear in that
          raceway's water quality history.
        </Text>
      )}

      <PrimaryButton title="Finish setup" onPress={onSave} loading={saving} />
    </Card>
  );
}

function DoneStep({
  device,
  onViewDevice,
  onAddAnother,
}: {
  device: Device;
  onViewDevice: () => void;
  onAddAnother: () => void;
}) {
  return (
    <Card style={styles.stepCard}>
      <View style={styles.successBadge}>
        <AppIcon name="check" size={20} color={colors.success} />
      </View>
      <Text style={styles.stepTitle}>{device.name} is set up</Text>
      {/*
        A brand-new node has every probe disabled — it ships without them, and
        a channel enabled with nothing wired to it reads a floating pin. So the
        next step is always "turn on the probes you actually fitted", and
        saying so here saves a support call about a device that reports nothing.
      */}
      <Text style={styles.stepBody}>
        It'll start reporting within a minute. Next, turn on the probes you've fitted — a new device arrives
        with all of them switched off.
      </Text>
      <PrimaryButton title="Set up probes" onPress={onViewDevice} />
      <PrimaryButton title="Add another device" variant="ghost" onPress={onAddAnother} />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingVertical: 20, paddingBottom: 48 },

  progressRow: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegmentDone: { backgroundColor: colors.teal },
  progressLabel: {
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted,
    letterSpacing: 0.3,
  },

  stepCard: { gap: 12 },
  stepTitle: { fontSize: 18, fontWeight: "800", color: colors.ocean },
  stepBody: { fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
  hint: { fontSize: 12, color: colors.inkMuted, lineHeight: 17, marginTop: -4 },
  busySpinner: { marginBottom: 4 },

  errorCard: { flexDirection: "row", gap: 11, backgroundColor: colors.coralSoft, borderColor: colors.coralSoft },
  errorIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  errorCopy: { flex: 1 },
  errorTitle: { fontSize: 14, fontWeight: "800", color: colors.coral },
  errorDetail: { fontSize: 13, color: colors.coral, marginTop: 3, lineHeight: 18 },

  cameraFrame: {
    marginHorizontal: 16,
    height: 320,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  // Written out rather than using StyleSheet.absoluteFillObject: RN 0.86's
  // types no longer expose it, and the four properties are clearer anyway.
  camera: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  reticle: {
    width: 200,
    height: 200,
    borderRadius: radii.md,
    borderWidth: 3,
    borderColor: colors.white,
    opacity: 0.9,
  },
  cameraHint: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  networkCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  networkCopy: { flex: 1 },
  networkSsid: { fontSize: 15, fontWeight: "700", color: colors.ink },
  networkMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },

  successBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
