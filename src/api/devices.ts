import { apiClient } from "./client";
import {
  Device,
  DeviceAlert,
  DeviceChannel,
  DeviceChannelConfig,
  DeviceOutput,
  DeviceReading,
  DeviceThreshold,
} from "./types";

export function fetchDevices() {
  return apiClient.get<{ devices: Device[] }>("/devices").then((r) => r.data.devices);
}

// `hours` bounds the readings window. The server caps it at 30 days; the
// detail screen asks for 24 hours by default because that is the span a
// dawn oxygen sag actually shows up in.
export function fetchDevice(id: string, hours = 24) {
  return apiClient
    .get<{ device: Device; readings: DeviceReading[]; alerts: DeviceAlert[] }>(`/devices/${id}`, {
      params: { hours },
    })
    .then((r) => r.data);
}

/**
 * Binds a physical node to this organization.
 *
 * Independent of whether the device is powered on or has finished joining
 * Wi-Fi — claiming and the device's own bootstrap are two halves that
 * rendezvous in either order. So the app can call this the moment the QR is
 * scanned, without waiting for provisioning to finish.
 */
export function claimDevice(input: { claimCode: string; name?: string; racewayId?: string }) {
  return apiClient.post<{ device: Device }>("/devices/claim", input).then((r) => r.data.device);
}

export function updateDevice(id: string, input: { name?: string; racewayId?: string | null }) {
  return apiClient.patch<{ device: Device }>(`/devices/${id}`, input).then((r) => r.data.device);
}

/**
 * Pushes a config change down to the node over its retained MQTT topic.
 *
 * This is what enabling a probe a customer bought months later actually
 * does — no reflash, no site visit. Channels are merged by type server-side,
 * so sending one channel does not disturb another's calibration.
 */
export function updateDeviceConfig(
  id: string,
  input: {
    sample_interval_s?: number;
    publish_interval_s?: number;
    failsafe_timeout_s?: number;
    channels?: DeviceChannelConfig[];
    thresholds?: Partial<Record<DeviceChannel, DeviceThreshold>>;
  }
) {
  return apiClient.put<{ device: Device }>(`/devices/${id}/config`, input).then((r) => r.data.device);
}

export type DeviceCommand =
  // ttl_s is mandatory and capped at 4 hours by both the server and the
  // firmware. An override that outlives the person who set it is how a pump
  // gets left off overnight.
  | { cmd: "relay"; output: DeviceOutput; state: boolean; ttl_s: number }
  | { cmd: "calibrate"; channel: DeviceChannel; point: 0 | 1; known_value: number }
  | { cmd: "identify"; seconds?: number }
  | { cmd: "reboot" }
  | { cmd: "ota"; url: string; sha256: string }
  | { cmd: "factory_reset" };

/**
 * Sends a command to a device.
 *
 * Rejected with 400 if the device is offline — the server refuses to queue
 * these rather than delivering a relay override hours later to a farm that
 * has moved on.
 */
export function sendDeviceCommand(id: string, command: DeviceCommand) {
  return apiClient
    .post<{ id: string; status: string }>(`/devices/${id}/command`, command)
    .then((r) => r.data);
}

export function acknowledgeDeviceAlert(deviceId: string, alertId: string) {
  return apiClient
    .post<{ alert: DeviceAlert }>(`/devices/${deviceId}/alerts/${alertId}/ack`)
    .then((r) => r.data.alert);
}

/**
 * Unclaims the device: returns it to the manufacturing registry so it can be
 * resold, RMA'd or moved to another farm, and revokes its broker credential.
 *
 * Readings already rolled up into the raceway's water-quality history stay —
 * that record belongs to the farm, not to the hardware.
 */
export function removeDevice(id: string) {
  return apiClient.delete(`/devices/${id}`);
}
