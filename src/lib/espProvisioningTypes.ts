/**
 * Shared types for BLE device provisioning.
 *
 * Kept in its own module rather than inside espProvisioning.ts, because
 * Metro resolves `./espProvisioning` to the `.native`/`.web` variant and
 * would never load a plain `.ts` of that name. Both implementations
 * re-export everything here, so callers still write one import:
 *
 *     import * as provisioning from "../../lib/espProvisioning";
 *
 * — the same shape as otpAuth.
 */

export interface WifiNetwork {
  ssid: string;
  rssi: number;
  /** True when the network needs a password. Open networks skip that step. */
  secured: boolean;
}

/**
 * Why provisioning failed, in terms the app can turn into a sentence a
 * farmer can act on.
 *
 * These exist because "provisioning failed" is useless. Two of them —
 * `wrongPassword` and `networkNotFound` — account for the overwhelming
 * majority of real setup failures, and they need completely different
 * advice: one is retype the password, the other is almost always someone
 * picking a 5 GHz SSID their phone can see and the device cannot.
 */
export type ProvisioningFailure =
  | "bluetoothOff"
  | "permissionDenied"
  | "deviceNotFound"
  | "wrongClaimCode"
  | "connectionLost"
  | "wrongPassword"
  | "networkNotFound"
  | "unsupportedPlatform"
  | "unknown";

export class ProvisioningError extends Error {
  reason: ProvisioningFailure;

  constructor(reason: ProvisioningFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = "ProvisioningError";
  }
}

/**
 * Farmer-facing copy for each failure. Deliberately says what to do next,
 * not what went wrong internally.
 */
export const FAILURE_COPY: Record<ProvisioningFailure, { title: string; detail: string }> = {
  bluetoothOff: {
    title: "Turn on Bluetooth",
    detail: "The app talks to a new device over Bluetooth before it joins your Wi-Fi.",
  },
  permissionDenied: {
    title: "Permission needed",
    detail:
      "FarmFin needs Bluetooth and location permission to find nearby devices. Android requires location access for any Bluetooth scan — it isn't used to track you.",
  },
  deviceNotFound: {
    title: "Can't find that device",
    detail:
      "Check it's powered on and within a few metres. A device that's already set up won't appear here — hold its button for 10 seconds to reset it.",
  },
  wrongClaimCode: {
    title: "That code doesn't match",
    detail: "The device refused the setup code. Re-scan the QR sticker on the box, or type the code printed under it.",
  },
  connectionLost: {
    title: "Lost connection to the device",
    detail: "Move closer to it and try again. Thick walls and metal sheds cut Bluetooth range sharply.",
  },
  wrongPassword: {
    title: "Wrong Wi-Fi password",
    detail: "The device reached your network but the password was rejected. Check for capitals and try again.",
  },
  networkNotFound: {
    title: "The device can't see that network",
    detail:
      "FarmFin devices only work on 2.4 GHz Wi-Fi. If your router has separate 2.4 and 5 GHz networks, pick the 2.4 GHz one — your phone may be on the 5 GHz half.",
  },
  unsupportedPlatform: {
    title: "Use the phone app",
    detail: "Setting up a new device needs Bluetooth, which browsers can't reach. Open FarmFin on your phone to add it.",
  },
  unknown: {
    title: "Setup didn't finish",
    detail: "Something went wrong talking to the device. Move closer, make sure it's powered, and try again.",
  },
};
