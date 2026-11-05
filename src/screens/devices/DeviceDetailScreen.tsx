import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BatchesStackParamList } from "../../navigation/types";
import {
  DeviceCommand,
  acknowledgeDeviceAlert,
  fetchDevice,
  removeDevice,
  sendDeviceCommand,
} from "../../api/devices";
import { apiErrorMessage } from "../../api/client";
import { CHANNELS, OUTPUT_LABELS, formatChannelValue, readingValue } from "../../lib/deviceChannels";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { StatusPill } from "../../components/StatusPill";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { PrimaryButton } from "../../components/PrimaryButton";
import { Sparkline, bucketReadings } from "../../components/Sparkline";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { useAuth } from "../../context/AuthContext";
import { notify } from "../../lib/notify";
import { confirmAction } from "../../lib/confirm";
import { DeviceAlert, DeviceOutput, DeviceReading, DeviceChannel } from "../../api/types";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "DeviceDetail">;

const POLL_INTERVAL_MS = 30_000;
const WINDOW_HOURS = 24;
const SPARK_BUCKETS = 24;

/**
 * How long a manual relay override lasts.
 *
 * Both the server and the firmware require an expiry and cap it at four
 * hours, so the app offers a short menu rather than a free-text field — an
 * override that outlives whoever set it is how a pump gets left off overnight.
 */
const OVERRIDE_MINUTES = 30;

export function DeviceDetailScreen({ route, navigation }: Props) {
  const { deviceId } = route.params;
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { refreshing, onRefresh } = useRefreshing();

  const canManage = hasPermission("devices.manage");

  const deviceQuery = useQuery({
    queryKey: ["device", deviceId],
    queryFn: () => fetchDevice(deviceId, WINDOW_HOURS),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
    queryClient.invalidateQueries({ queryKey: ["devices"] });
  };

  const commandMutation = useMutation({
    mutationFn: (command: DeviceCommand) => sendDeviceCommand(deviceId, command),
    onError: (error) => notify("Couldn't send that", apiErrorMessage(error)),
  });

  const ackMutation = useMutation({
    mutationFn: (alertId: string) => acknowledgeDeviceAlert(deviceId, alertId),
    onSuccess: invalidate,
    onError: (error) => notify("Couldn't acknowledge", apiErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: () => removeDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      notify("Device removed", "It can now be set up on another farm.");
      navigation.goBack();
    },
    onError: (error) => notify("Couldn't remove it", apiErrorMessage(error)),
  });

  const device = deviceQuery.data?.device;
  const readings = deviceQuery.data?.readings ?? [];
  const alerts = deviceQuery.data?.alerts ?? [];

  // Bucketed once for all channels rather than per tile — nine tiles walking
  // a day of readings each is nine passes over the same array.
  const windowStart = Date.now() - WINDOW_HOURS * 3600_000;
  const series = useMemo(() => {
    const time = (reading: DeviceReading) => new Date(reading.recordedAt).getTime();
    const result = {} as Record<DeviceChannel, (number | null)[]>;

    for (const meta of CHANNELS) {
      result[meta.key] = bucketReadings(
        readings,
        time,
        (reading) => readingValue(reading, meta.key),
        SPARK_BUCKETS,
        windowStart,
        Date.now()
      );
    }
    return result;
  }, [readings, windowStart]);

  if (deviceQuery.isPending) return <LoadingView />;
  if (deviceQuery.isError) {
    return <ErrorBanner message={apiErrorMessage(deviceQuery.error)} onRetry={deviceQuery.refetch} />;
  }
  if (!device) return null;

  const latest = readings[readings.length - 1] ?? device.latestReading ?? null;
  const enabledChannels = (device.config?.channels ?? []).filter((channel) => channel.enabled);
  const faults = latest?.health?.sensor_faults ?? [];
  const openAlerts = alerts.filter((alert) => !alert.clearedAt);
  const inFailsafe = latest?.health?.failsafe === true;

  const sendCommand = (command: DeviceCommand, successMessage: string) => {
    commandMutation.mutate(command, { onSuccess: () => notify("Sent", successMessage) });
  };

  return (
    <RefreshableScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* ── Status ─────────────────────────────────────────────────── */}
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceWhere}>
              {device.raceway?.name ?? "Not assigned to a raceway"}
            </Text>
          </View>
          <StatusPill
            label={device.online ? "Live" : "Offline"}
            tone={device.online ? "success" : "critical"}
          />
        </View>

        <View style={styles.metaRow}>
          <Meta label="Firmware" value={device.firmwareVersion ?? "—"} />
          <Meta
            label="Signal"
            value={typeof device.lastRssi === "number" ? `${device.lastRssi} dBm` : "—"}
          />
          <Meta
            label="Buffered"
            value={
              typeof latest?.health?.buffered === "number" ? `${latest.health.buffered}` : "—"
            }
          />
        </View>
      </Card>

      {/*
        Failsafe means the device gave up on reaching the server and forced its
        outputs safe. Surfaced above everything else, because from this point
        the readings below are stale and the farmer is looking at history.
      */}
      {inFailsafe && (
        <Card style={styles.failsafeCard}>
          <AppIcon name="shield" size={18} color={colors.amber} />
          <View style={styles.failsafeCopy}>
            <Text style={styles.failsafeTitle}>Running in failsafe</Text>
            <Text style={styles.failsafeBody}>
              This device lost contact with AquaQueen and switched to its safe settings — aerator on,
              valve closed. It's still protecting the fish, but the readings below may be out of date.
            </Text>
          </View>
        </Card>
      )}

      {/* ── Alerts ─────────────────────────────────────────────────── */}
      {openAlerts.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Open alerts</Text>
          {openAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={canManage ? () => ackMutation.mutate(alert.id) : undefined}
            />
          ))}
        </>
      )}

      {/* ── Readings ───────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Readings · last {WINDOW_HOURS} hours</Text>

      {enabledChannels.length === 0 ? (
        <Card style={styles.noChannelsCard}>
          <Text style={styles.noChannelsTitle}>No probes switched on</Text>
          <Text style={styles.noChannelsBody}>
            A new device arrives with every probe switched off, because it ships without them. Turn on
            the ones you've fitted and it'll start reporting within a minute.
          </Text>
          {canManage && (
            <PrimaryButton
              title="Set up probes"
              onPress={() => navigation.navigate("DeviceChannels", { deviceId })}
            />
          )}
        </Card>
      ) : (
        <View style={styles.tileGrid}>
          {CHANNELS.filter((meta) =>
            enabledChannels.some((channel) => channel.type === meta.key)
          ).map((meta) => {
            const value = readingValue(latest, meta.key);
            const faulted = faults.includes(meta.key);
            const breached = openAlerts.some(
              (alert) => alert.kind === "THRESHOLD_BREACH" && alert.channel === meta.key
            );

            return (
              <View key={meta.key} style={styles.tile}>
                <View style={styles.tileHeader}>
                  <AppIcon
                    name={meta.icon}
                    size={13}
                    color={breached ? colors.coral : colors.inkMuted}
                  />
                  <Text style={styles.tileLabel}>{meta.label}</Text>
                </View>

                {/*
                  Value text stays in ink tokens, not the series colour — the
                  sparkline beside it carries identity. A faulted or absent
                  reading shows "—" and says why underneath.
                */}
                <Text style={[styles.tileValue, value === null && styles.tileValueMissing]}>
                  {formatChannelValue(value, meta.key)}
                </Text>

                {faulted && <Text style={styles.tileFault}>Probe not responding</Text>}

                <Sparkline
                  values={series[meta.key]}
                  tone={breached ? "critical" : "normal"}
                />
              </View>
            );
          })}
        </View>
      )}

      {/* ── Outputs ────────────────────────────────────────────────── */}
      {latest?.outputs && (
        <>
          <Text style={styles.sectionTitle}>Outputs</Text>
          <Card style={styles.outputCard}>
            {(Object.keys(OUTPUT_LABELS) as DeviceOutput[]).map((output) => {
              const on = latest.outputs?.[output] === true;
              return (
                <View key={output} style={styles.outputRow}>
                  <View style={[styles.outputDot, on && styles.outputDotOn]} />
                  <Text style={styles.outputLabel}>{OUTPUT_LABELS[output]}</Text>
                  <Text style={[styles.outputState, on && styles.outputStateOn]}>
                    {on ? "On" : "Off"}
                  </Text>
                  {canManage && device.online && !inFailsafe && (
                    <TouchableOpacity
                      style={styles.outputAction}
                      onPress={() =>
                        confirmAction(
                          {
                            title: `Turn the ${OUTPUT_LABELS[output].toLowerCase()} ${on ? "off" : "on"}?`,
                            message: `This overrides the automatic control for ${OVERRIDE_MINUTES} minutes, then it goes back to normal by itself.`,
                            confirmLabel: on ? "Turn off" : "Turn on",
                            destructive: on,
                          },
                          () =>
                            sendCommand(
                              {
                                cmd: "relay",
                                output,
                                state: !on,
                                ttl_s: OVERRIDE_MINUTES * 60,
                              },
                              `${OUTPUT_LABELS[output]} overridden for ${OVERRIDE_MINUTES} minutes.`
                            )
                        )
                      }
                    >
                      <Text style={styles.outputActionText}>{on ? "Turn off" : "Turn on"}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            {/*
              Overrides always expire. Saying so where the buttons are is the
              difference between a farmer trusting the override and a farmer
              driving back at midnight to check they undid it.
            */}
            {canManage && (
              <Text style={styles.outputNote}>
                Manual changes last {OVERRIDE_MINUTES} minutes, then automatic control resumes. Safety
                limits still apply — the aerator won't stay off during an oxygen drop.
              </Text>
            )}
          </Card>
        </>
      )}

      {/* ── Manage ─────────────────────────────────────────────────── */}
      {canManage && (
        <>
          <Text style={styles.sectionTitle}>Manage</Text>

          <ManageRow
            icon="sliders"
            title="Probes & calibration"
            subtitle="Switch probes on, calibrate them, set alert limits"
            onPress={() => navigation.navigate("DeviceChannels", { deviceId })}
          />
          <ManageRow
            icon="edit-3"
            title="Name & raceway"
            subtitle={device.raceway?.name ?? "Not assigned"}
            onPress={() => navigation.navigate("DeviceSettings", { deviceId })}
          />
          <ManageRow
            icon="zap"
            title="Find this device"
            subtitle="Flash its light so you can spot it"
            disabled={!device.online}
            onPress={() => sendCommand({ cmd: "identify", seconds: 30 }, "Its light will flash for 30 seconds.")}
          />
          <ManageRow
            icon="refresh-cw"
            title="Restart"
            subtitle="Takes about thirty seconds"
            disabled={!device.online}
            onPress={() =>
              confirmAction(
                {
                  title: "Restart this device?",
                  message:
                    "It'll stop reporting for about thirty seconds. The aerator keeps running on its safe setting throughout.",
                  confirmLabel: "Restart",
                },
                () => sendCommand({ cmd: "reboot" }, "Restarting.")
              )
            }
          />
          <ManageRow
            icon="trash-2"
            title="Remove from this farm"
            subtitle="Frees the device to be set up elsewhere"
            destructive
            onPress={() =>
              confirmAction(
                {
                  title: `Remove ${device.name}?`,
                  message:
                    "It'll stop reporting and can be set up on another farm. Readings already recorded against the raceway stay in its water quality history.",
                  confirmLabel: "Remove",
                  destructive: true,
                },
                () => removeMutation.mutate()
              )
            }
          />
        </>
      )}
    </RefreshableScrollView>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const ALERT_TITLES: Record<DeviceAlert["kind"], string> = {
  THRESHOLD_BREACH: "Reading out of range",
  SENSOR_FAULT: "Probe fault",
  DEVICE_OFFLINE: "Device offline",
  FAILSAFE_ENGAGED: "Failsafe engaged",
  BUFFER_OVERFLOW: "Readings being lost",
};

function AlertCard({ alert, onAcknowledge }: { alert: DeviceAlert; onAcknowledge?: () => void }) {
  return (
    <Card style={styles.alertCard}>
      <View style={styles.alertIcon}>
        <AppIcon name="alert-triangle" size={16} color={colors.coral} />
      </View>
      <View style={styles.alertCopy}>
        <Text style={styles.alertTitle}>{ALERT_TITLES[alert.kind]}</Text>
        <Text style={styles.alertMessage}>{alert.message}</Text>
        <Text style={styles.alertTime}>{new Date(alert.raisedAt).toLocaleString()}</Text>
      </View>
      {/*
        Acknowledging records that someone saw it — it does not clear it. The
        alert clears itself when the reading recovers, so an ongoing oxygen
        crash can't be dismissed into invisibility.
      */}
      {onAcknowledge && !alert.acknowledgedAt && (
        <TouchableOpacity onPress={onAcknowledge} style={styles.ackButton}>
          <Text style={styles.ackText}>Seen</Text>
        </TouchableOpacity>
      )}
      {alert.acknowledgedAt && <Text style={styles.ackedText}>Seen</Text>}
    </Card>
  );
}

function ManageRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive,
  disabled,
}: {
  icon: React.ComponentProps<typeof AppIcon>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled}>
      <Card style={[styles.manageCard, disabled && styles.manageDisabled]}>
        <View style={[styles.manageIcon, destructive && styles.manageIconDestructive]}>
          <AppIcon name={icon} size={16} color={destructive ? colors.coral : colors.teal} />
        </View>
        <View style={styles.manageCopy}>
          <Text style={[styles.manageTitle, destructive && styles.manageTitleDestructive]}>
            {title}
          </Text>
          <Text style={styles.manageSubtitle}>
            {disabled ? "Needs the device to be online" : subtitle}
          </Text>
        </View>
        <AppIcon name="chevron-right" />
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingVertical: 16, paddingBottom: 40 },

  sectionTitle: {
    color: colors.ocean,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: 16,
  },

  headerCard: { gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  headerCopy: { flex: 1 },
  deviceName: { fontSize: 18, fontWeight: "800", color: colors.ink },
  deviceWhere: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },

  metaRow: { flexDirection: "row", gap: 8 },
  meta: { flex: 1 },
  metaLabel: { fontSize: 10, fontWeight: "800", color: colors.inkMuted, letterSpacing: 0.4 },
  metaValue: { fontSize: 13, fontWeight: "700", color: colors.ink, marginTop: 3 },

  failsafeCard: {
    flexDirection: "row",
    gap: 11,
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberSoft,
  },
  failsafeCopy: { flex: 1 },
  failsafeTitle: { fontSize: 14, fontWeight: "800", color: colors.amber },
  failsafeBody: { fontSize: 13, color: colors.amber, marginTop: 3, lineHeight: 18 },

  alertCard: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.coralSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  alertCopy: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
  alertMessage: { fontSize: 13, color: colors.inkMuted, marginTop: 3, lineHeight: 18 },
  alertTime: { fontSize: 11, color: colors.inkMuted, marginTop: 5 },
  ackButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ackText: { fontSize: 12, fontWeight: "800", color: colors.teal },
  ackedText: { fontSize: 11, fontWeight: "700", color: colors.inkMuted },

  noChannelsCard: { gap: 12 },
  noChannelsTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  noChannelsBody: { fontSize: 13, color: colors.inkMuted, lineHeight: 19 },

  tileGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 10 },
  tile: {
    flexGrow: 1,
    flexBasis: "46%",
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 6,
  },
  tileHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  tileLabel: { fontSize: 11, fontWeight: "700", color: colors.inkMuted, flex: 1 },
  tileValue: { fontSize: 20, fontWeight: "800", color: colors.ink },
  tileValueMissing: { color: colors.inkMuted },
  tileFault: { fontSize: 11, color: colors.coral, fontWeight: "700" },

  outputCard: { gap: 12 },
  outputRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  outputDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.border },
  outputDotOn: { backgroundColor: colors.success },
  outputLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink },
  outputState: { fontSize: 13, color: colors.inkMuted, fontWeight: "700" },
  outputStateOn: { color: colors.success },
  outputAction: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  outputActionText: { fontSize: 12, fontWeight: "800", color: colors.teal },
  outputNote: { fontSize: 12, color: colors.inkMuted, lineHeight: 17 },

  manageCard: { flexDirection: "row", alignItems: "center", gap: 11 },
  manageDisabled: { opacity: 0.55 },
  manageIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  manageIconDestructive: { backgroundColor: colors.coralSoft },
  manageCopy: { flex: 1 },
  manageTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  manageTitleDestructive: { color: colors.coral },
  manageSubtitle: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
});
