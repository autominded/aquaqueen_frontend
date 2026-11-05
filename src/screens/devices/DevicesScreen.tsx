import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BatchesStackParamList } from "../../navigation/types";
import { fetchDevices } from "../../api/devices";
import { apiErrorMessage } from "../../api/client";
import { CHANNELS, formatChannelValue, readingValue } from "../../lib/deviceChannels";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { StatusPill } from "../../components/StatusPill";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { PrimaryButton } from "../../components/PrimaryButton";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { useAuth } from "../../context/AuthContext";
import { Device } from "../../api/types";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "Devices">;

/**
 * Live-ish without a socket: devices publish about once a minute, so polling
 * at 30s means the list is never more than one reading behind. A websocket
 * would be tighter, but this is a screen someone glances at — not a control
 * room — and polling survives the flaky rural uplinks these farms run on.
 */
const POLL_INTERVAL_MS = 30_000;

/** How many channel values to show per card before it stops being scannable. */
const PREVIEW_CHANNELS = 4;

function lastSeenLabel(device: Device): string {
  if (device.online) return "Live";
  if (!device.lastSeenAt) return "Never reported";

  const minutes = Math.floor((Date.now() - new Date(device.lastSeenAt).getTime()) / 60000);
  if (minutes < 60) return `Last seen ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  return `Last seen ${Math.floor(hours / 24)}d ago`;
}

export function DevicesScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { refreshing, onRefresh } = useRefreshing();

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: fetchDevices,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const canManage = hasPermission("devices.manage");
  const devices = devicesQuery.data ?? [];

  return (
    <RefreshableScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {devicesQuery.isPending && <LoadingView />}
      {devicesQuery.isError && (
        <ErrorBanner message={apiErrorMessage(devicesQuery.error)} onRetry={devicesQuery.refetch} />
      )}

      {devicesQuery.isSuccess && devices.length === 0 && (
        <Card style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <AppIcon name="cpu" size={22} color={colors.teal} />
          </View>
          <Text style={styles.emptyTitle}>No monitoring devices yet</Text>
          <Text style={styles.emptyBody}>
            An AquaQueen device sits on a raceway and reads its water around the clock — oxygen,
            temperature, level — and switches the aerator on by itself when oxygen drops, even if the
            internet is down.
          </Text>
          {canManage && (
            <PrimaryButton title="Add a device" onPress={() => navigation.navigate("AddDevice")} />
          )}
        </Card>
      )}

      {devices.map((device) => {
        const reading = device.latestReading;
        const enabled = (device.config?.channels ?? []).filter((channel) => channel.enabled);

        // Preview only channels that are switched on. A brand-new device has
        // none, which is a real state worth showing plainly rather than
        // padding out with dashes.
        const preview = CHANNELS.filter((meta) =>
          enabled.some((channel) => channel.type === meta.key)
        ).slice(0, PREVIEW_CHANNELS);

        return (
          <TouchableOpacity
            key={device.id}
            onPress={() => navigation.navigate("DeviceDetail", { deviceId: device.id })}
          >
            <Card style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={styles.deviceHeading}>
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

              {(device.openAlerts ?? 0) > 0 && (
                <View style={styles.alertRow}>
                  <AppIcon name="alert-triangle" size={14} color={colors.coral} />
                  <Text style={styles.alertText}>
                    {device.openAlerts} open {device.openAlerts === 1 ? "alert" : "alerts"}
                  </Text>
                </View>
              )}

              {preview.length === 0 ? (
                <Text style={styles.setupHint}>
                  No probes switched on yet — tap to set up the ones you've fitted.
                </Text>
              ) : (
                <View style={styles.readingRow}>
                  {preview.map((meta) => {
                    const value = readingValue(reading, meta.key);
                    return (
                      <View key={meta.key} style={styles.readingCell}>
                        <Text style={styles.readingLabel}>{meta.short}</Text>
                        {/*
                          A missing value renders "—". It must never render 0:
                          a faulted oxygen probe and an oxygen crash look
                          identical if you let a null become a number.
                        */}
                        <Text style={[styles.readingValue, value === null && styles.readingMissing]}>
                          {formatChannelValue(value, meta.key)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              <Text style={styles.footer}>{lastSeenLabel(device)}</Text>
            </Card>
          </TouchableOpacity>
        );
      })}

      {canManage && devices.length > 0 && (
        <PrimaryButton
          title="Add a device"
          variant="secondary"
          style={styles.addButton}
          onPress={() => navigation.navigate("AddDevice")}
        />
      )}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingVertical: 16, paddingBottom: 40 },

  emptyCard: { alignItems: "center", gap: 12, paddingVertical: 28 },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.ocean },
  emptyBody: { fontSize: 14, color: colors.inkMuted, textAlign: "center", lineHeight: 20 },

  deviceCard: { gap: 10 },
  deviceHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  deviceHeading: { flex: 1 },
  deviceName: { fontSize: 16, fontWeight: "800", color: colors.ink },
  deviceWhere: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },

  alertRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertText: { fontSize: 12, fontWeight: "700", color: colors.coral },

  setupHint: { fontSize: 13, color: colors.inkMuted, lineHeight: 18 },

  readingRow: { flexDirection: "row", gap: 8 },
  readingCell: { flex: 1 },
  readingLabel: { fontSize: 10, fontWeight: "800", color: colors.inkMuted, letterSpacing: 0.4 },
  readingValue: { fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 3 },
  readingMissing: { color: colors.inkMuted, fontWeight: "600" },

  footer: { fontSize: 11, color: colors.inkMuted },

  addButton: { marginHorizontal: 16, marginTop: 8 },
});
