import { ProvisioningError, WifiNetwork } from "./espProvisioningTypes";

export * from "./espProvisioningTypes";

/**
 * Web has no path to this.
 *
 * Espressif's provisioning SDK is a native module, and the Web Bluetooth API
 * cannot substitute: it has no support for the protocomm security handshake
 * the firmware requires, and Safari — which is most of the phones that would
 * hit the web build — doesn't implement Web Bluetooth at all.
 *
 * So rather than half-build it, every entry point fails with
 * `unsupportedPlatform`, and the UI turns that into "open FarmFin on your
 * phone to add a device". Everything *else* about devices — the list, live
 * readings, alerts, thresholds, calibration, relay control — works fine on
 * web, because all of it goes through the API rather than Bluetooth.
 *
 * Same shape as otpAuth.web.ts: a real module for the platform, not a stub
 * that throws at import time.
 */
function unsupported(): never {
  throw new ProvisioningError(
    "unsupportedPlatform",
    "Adding a device needs Bluetooth, which isn't available in a browser."
  );
}

export async function ensurePermissions(): Promise<void> {
  unsupported();
}

export async function findDevice(_deviceId: string): Promise<string> {
  unsupported();
}

export async function connect(_deviceName: string, _claimCode: string): Promise<void> {
  unsupported();
}

export async function scanNetworks(): Promise<WifiNetwork[]> {
  unsupported();
}

export async function provision(_ssid: string, _passphrase: string): Promise<void> {
  unsupported();
}

/** No-op rather than throwing — cleanup paths call this unconditionally. */
export function disconnect(): void {}

export const isSupported = false;
