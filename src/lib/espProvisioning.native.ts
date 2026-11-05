import { PermissionsAndroid, Platform } from "react-native";
import {
  ESPDevice,
  ESPProvisionManager,
  ESPSecurity,
  ESPTransport,
} from "@orbital-systems/react-native-esp-idf-provisioning";

import { ProvisioningError, WifiNetwork } from "./espProvisioningTypes";

export * from "./espProvisioningTypes";

/**
 * BLE provisioning against the AquaQueen node firmware (D:\iot).
 *
 * The firmware advertises as `AQ_<last-6-of-MAC>` using ESP-IDF's
 * WIFI_PROV_SECURITY_1, which is `ESPSecurity.secure` here, and takes the
 * claim code printed on the enclosure as its proof of possession.
 *
 * Held as a module-level handle rather than passed through navigation
 * params, for the same reason otpAuth.native.ts does it: the ESPDevice
 * object carries live native methods and cannot be serialized across a
 * screen boundary.
 */
let connectedDevice: ESPDevice | null = null;

/** Matches the `AQ_` prefix set in aq_prov.c's start_ble_provisioning. */
const DEVICE_PREFIX = "AQ_";

/**
 * Translates whatever the native SDK threw into something the app can
 * explain.
 *
 * The underlying libraries surface failures as loosely-typed messages that
 * differ between iOS and Android, so this matches on substrings. Ugly, but
 * the alternative is showing a farmer a raw SDK error, and the difference
 * between "wrong password" and "that's a 5 GHz network" is the difference
 * between them fixing it and them phoning you.
 */
function toProvisioningError(error: unknown, fallbackContext: "scan" | "connect" | "provision"): ProvisioningError {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("bluetooth") && (lower.includes("off") || lower.includes("poweredoff") || lower.includes("unavailable"))) {
    return new ProvisioningError("bluetoothOff", message);
  }
  if (lower.includes("permission") || lower.includes("unauthorized") || lower.includes("denied")) {
    return new ProvisioningError("permissionDenied", message);
  }
  if (lower.includes("proof of possession") || lower.includes("pop") || lower.includes("authentication") || lower.includes("decrypt")) {
    // The device rejected the session key derived from the claim code. Either
    // the QR was misread or it belongs to a different unit.
    return new ProvisioningError("wrongClaimCode", message);
  }
  if (lower.includes("not found") || lower.includes("no device") || lower.includes("no peripheral")) {
    return new ProvisioningError(fallbackContext === "scan" ? "deviceNotFound" : "connectionLost", message);
  }
  if (lower.includes("disconnect") || lower.includes("timeout") || lower.includes("timed out")) {
    return new ProvisioningError("connectionLost", message);
  }
  if (fallbackContext === "provision") {
    // These two come back from the firmware's WIFI_PROV_CRED_FAIL handler.
    if (lower.includes("auth") || lower.includes("password") || lower.includes("passphrase")) {
      return new ProvisioningError("wrongPassword", message);
    }
    if (lower.includes("ap not found") || lower.includes("network not found") || lower.includes("ssid")) {
      return new ProvisioningError("networkNotFound", message);
    }
  }
  return new ProvisioningError("unknown", message);
}

/**
 * Android requires location permission for any BLE scan, and BLUETOOTH_SCAN
 * / BLUETOOTH_CONNECT on API 31+.
 *
 * Requested up front rather than letting the scan fail first, so the farmer
 * sees a permission dialog with a reason rather than an unexplained "no
 * devices found". iOS handles this through the Info.plist strings the config
 * plugin writes.
 */
export async function ensurePermissions(): Promise<void> {
  if (Platform.OS !== "android") return;

  const required: string[] = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  // API 31 split Bluetooth into its own runtime permissions. Requesting them
  // on older Android throws, so they are added conditionally.
  if (typeof Platform.Version === "number" && Platform.Version >= 31) {
    required.push(
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
    );
  }

  const granted = await PermissionsAndroid.requestMultiple(required as never);
  const denied = Object.values(granted).some((state) => state !== PermissionsAndroid.RESULTS.GRANTED);

  if (denied) {
    throw new ProvisioningError(
      "permissionDenied",
      "Bluetooth and location permission are required to find nearby devices."
    );
  }
}

/**
 * Finds an unclaimed node advertising nearby.
 *
 * `deviceId` is the full id from the QR; only its last six characters appear
 * in the advertised name, which is also what is printed on the label so a
 * farmer unboxing three at once can tell them apart.
 */
export async function findDevice(deviceId: string): Promise<string> {
  await ensurePermissions();

  const suffix = deviceId.slice(-6);
  const expectedName = `${DEVICE_PREFIX}${suffix}`;

  let devices: { name: string }[];
  try {
    devices = await ESPProvisionManager.searchESPDevices(DEVICE_PREFIX, ESPTransport.ble, ESPSecurity.secure);
  } catch (error) {
    throw toProvisioningError(error, "scan");
  }

  const match = devices.find((device) => device.name === expectedName);
  if (!match) {
    throw new ProvisioningError(
      "deviceNotFound",
      devices.length
        ? `Found ${devices.length} AquaQueen device(s) nearby, but not ${expectedName}.`
        : "No AquaQueen devices are advertising nearby."
    );
  }
  return match.name;
}

/**
 * Opens the encrypted session, with the claim code as proof of possession.
 *
 * This is what stops someone in Bluetooth range from adopting a node they
 * don't physically have: the only way to get the code is to hold the box.
 */
export async function connect(deviceName: string, claimCode: string): Promise<void> {
  const device = new ESPDevice({
    name: deviceName,
    transport: ESPTransport.ble,
    security: ESPSecurity.secure,
  });

  try {
    await device.connect(claimCode);
    connectedDevice = device;
  } catch (error) {
    // Leaving a half-open BLE session behind blocks the next attempt, and a
    // farmer retrying after a mistyped code is the common case.
    try {
      device.disconnect();
    } catch {
      // Already gone.
    }
    throw toProvisioningError(error, "connect");
  }
}

/**
 * The networks the *device* can see — not the ones the phone can see.
 *
 * This distinction is the whole point. ESP32 has no 5 GHz radio, so on a
 * dual-band router the phone's list and the device's list differ, and
 * offering the phone's would let a farmer pick a network the node can never
 * join. Deduplicated by SSID keeping the strongest signal, since mesh
 * networks advertise the same name from several access points.
 */
export async function scanNetworks(): Promise<WifiNetwork[]> {
  if (!connectedDevice) {
    throw new ProvisioningError("connectionLost", "Not connected to a device.");
  }

  try {
    const networks = await connectedDevice.scanWifiList();

    const strongest = new Map<string, WifiNetwork>();
    for (const network of networks) {
      if (!network.ssid) continue;
      const existing = strongest.get(network.ssid);
      if (!existing || network.rssi > existing.rssi) {
        strongest.set(network.ssid, {
          ssid: network.ssid,
          rssi: network.rssi,
          // auth mode 0 is open; everything else needs a passphrase.
          secured: network.auth !== 0,
        });
      }
    }

    return [...strongest.values()].sort((a, b) => b.rssi - a.rssi);
  } catch (error) {
    throw toProvisioningError(error, "connect");
  }
}

/** Hands over the credentials. Resolves once the device confirms it joined. */
export async function provision(ssid: string, passphrase: string): Promise<void> {
  if (!connectedDevice) {
    throw new ProvisioningError("connectionLost", "Not connected to a device.");
  }

  try {
    await connectedDevice.provision(ssid, passphrase);
  } catch (error) {
    throw toProvisioningError(error, "provision");
  }
}

/**
 * Closes the BLE session.
 *
 * Always call this when leaving the flow, including on cancel. The firmware
 * releases its Bluetooth stack after a successful provision and cannot
 * accept a second session without rebooting, so a session left open on the
 * phone side is a device that appears unresponsive on the next attempt.
 */
export function disconnect(): void {
  try {
    connectedDevice?.disconnect();
  } catch {
    // Already disconnected, or the device rebooted out from under us —
    // which is the expected ending of a successful provision.
  }
  connectedDevice = null;
}

export const isSupported = true;
