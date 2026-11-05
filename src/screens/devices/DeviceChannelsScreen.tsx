import React from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BatchesStackParamList } from "../../navigation/types";
import { fetchDevice, updateDeviceConfig } from "../../api/devices";
import { apiErrorMessage } from "../../api/client";
import { CHANNELS, TWO_POINT_CHANNELS, formatChannelValue, readingValue } from "../../lib/deviceChannels";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { notify } from "../../lib/notify";
import { DeviceChannel } from "../../api/types";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "DeviceChannels">;

/**
 * Switching probes on and off.
 *
 * This screen is the reason the firmware carries a channel table in NVS
 * instead of a compile-time sensor list. A customer buys the node, then buys
 * probes over the following months; each one becomes a toggle here and a
 * retained MQTT message, not a reflash and a site visit.
 *
 * Nothing here is destructive and nothing needs the device to be online — the
 * config is retained on the broker, so a device that is currently offline
 * picks it up the moment it reconnects.
 */
export function DeviceChannelsScreen({ route, navigation }: Props) {
  const { deviceId } = route.params;
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();

  const deviceQuery = useQuery({
    queryKey: ["device", deviceId],
    queryFn: () => fetchDevice(deviceId, 1),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ channel, enabled }: { channel: DeviceChannel; enabled: boolean }) =>
      // Only the one channel is sent. The server merges by type, so this can't
      // disturb another probe's calibration coefficients.
      updateDeviceConfig(deviceId, { channels: [{ type: channel, enabled }] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (error) => notify("Couldn't save that", apiErrorMessage(error)),
  });

  if (deviceQuery.isPending) return <LoadingView />;
  if (deviceQuery.isError) {
    return <ErrorBanner message={apiErrorMessage(deviceQuery.error)} onRetry={deviceQuery.refetch} />;
  }

  const device = deviceQuery.data?.device;
  if (!device) return null;

  const configured = device.config?.channels ?? [];
  const latest = deviceQuery.data?.readings[deviceQuery.data.readings.length - 1] ?? device.latestReading ?? null;
  const faults = latest?.health?.sensor_faults ?? [];

  return (
    <RefreshableScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Card style={styles.introCard}>
        <Text style={styles.introTitle}>Switch on what you've fitted</Text>
        <Text style={styles.introBody}>
          Probes are sold separately, so a device starts with all of them off. Turn on each one you've
          wired up — the device picks up the change within a minute, even if it's offline right now.
        </Text>
      </Card>

      {CHANNELS.map((meta) => {
        const channel = configured.find((entry) => entry.type === meta.key);
        const enabled = channel?.enabled ?? false;
        const calibrated = (channel?.cal?.length ?? 0) > 0;
        const needsCalibration = TWO_POINT_CHANNELS.includes(meta.key);
        const faulted = faults.includes(meta.key);
        const value = readingValue(latest, meta.key);

        return (
          <Card key={meta.key} style={styles.channelCard}>
            <View style={styles.channelHeader}>
              <View style={[styles.channelIcon, enabled && styles.channelIconOn]}>
                <AppIcon name={meta.icon} size={16} color={enabled ? colors.teal : colors.inkMuted} />
              </View>
              <View style={styles.channelCopy}>
                <Text style={styles.channelName}>{meta.label}</Text>
                {/*
                  A disabled channel shows what the probe is FOR, not its
                  current value — someone deciding whether to spend £80 needs
                  to know what it buys them, and "ec" tells them nothing.
                */}
                <Text style={styles.channelPurpose}>
                  {enabled ? formatChannelValue(value, meta.key) : meta.purpose}
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={(next) => toggleMutation.mutate({ channel: meta.key, enabled: next })}
                disabled={toggleMutation.isPending}
                trackColor={{ false: colors.border, true: colors.tealSoft }}
                thumbColor={enabled ? colors.teal : colors.surface}
              />
            </View>

            {enabled && faulted && (
              <View style={styles.faultRow}>
                <AppIcon name="alert-triangle" size={14} color={colors.coral} />
                <Text style={styles.faultText}>
                  Not responding. Check the cable is seated and the probe is in the water.
                </Text>
              </View>
            )}

            {enabled && needsCalibration && (
              <TouchableOpacity
                style={styles.calibrateRow}
                onPress={() => navigation.navigate("DeviceCalibration", { deviceId, channel: meta.key })}
              >
                <AppIcon name="target" size={14} color={colors.teal} />
                <Text style={styles.calibrateText}>
                  {calibrated ? "Calibrated · recalibrate" : "Not calibrated yet — readings are approximate"}
                </Text>
                <AppIcon name="chevron-right" size={16} />
              </TouchableOpacity>
            )}
          </Card>
        );
      })}

      <TouchableOpacity onPress={() => navigation.navigate("DeviceThresholds", { deviceId })}>
        <Card style={styles.manageCard}>
          <View style={styles.manageIcon}>
            <AppIcon name="bell" size={16} color={colors.teal} />
          </View>
          <View style={styles.manageCopy}>
            <Text style={styles.manageTitle}>Alert limits</Text>
            <Text style={styles.manageSubtitle}>
              When to warn you, and when to switch the aerator on automatically
            </Text>
          </View>
          <AppIcon name="chevron-right" />
        </Card>
      </TouchableOpacity>
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingVertical: 16, paddingBottom: 40 },

  introCard: { gap: 6 },
  introTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  introBody: { fontSize: 13, color: colors.inkMuted, lineHeight: 19 },

  channelCard: { gap: 10 },
  channelHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  channelIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  channelIconOn: { backgroundColor: colors.tealSoft },
  channelCopy: { flex: 1 },
  channelName: { fontSize: 14, fontWeight: "800", color: colors.ink },
  channelPurpose: { fontSize: 12, color: colors.inkMuted, marginTop: 3, lineHeight: 17 },

  faultRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  faultText: { flex: 1, fontSize: 12, color: colors.coral, lineHeight: 17 },

  calibrateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  calibrateText: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.teal },

  manageCard: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 12 },
  manageIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.tealSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  manageCopy: { flex: 1 },
  manageTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  manageSubtitle: { fontSize: 12, color: colors.inkMuted, marginTop: 2, lineHeight: 17 },
});
