import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BatchesStackParamList } from "../../navigation/types";
import { fetchDevice, updateDeviceConfig } from "../../api/devices";
import { apiErrorMessage } from "../../api/client";
import { CHANNELS, OUTPUT_LABELS } from "../../lib/deviceChannels";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { notify } from "../../lib/notify";
import { DeviceChannel, DeviceThreshold } from "../../api/types";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "DeviceThresholds">;

type Draft = Partial<Record<DeviceChannel, { min: string; max: string }>>;

/** Empty input means "no limit", which the API expresses as an explicit null. */
function parseBound(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function DeviceThresholdsScreen({ route }: Props) {
  const { deviceId } = route.params;
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();

  const [draft, setDraft] = useState<Draft>({});
  const [seeded, setSeeded] = useState(false);

  const deviceQuery = useQuery({
    queryKey: ["device", deviceId],
    queryFn: () => fetchDevice(deviceId, 1),
  });

  const device = deviceQuery.data?.device;

  // Seed-once from the fetched config, guarded so a background refetch can't
  // wipe out edits in progress — same pattern the app's other edit screens use.
  if (device && !seeded) {
    const thresholds = device.config?.thresholds ?? {};
    const next: Draft = {};
    for (const meta of CHANNELS) {
      const rule = thresholds[meta.key];
      next[meta.key] = {
        min: typeof rule?.min === "number" ? String(rule.min) : "",
        max: typeof rule?.max === "number" ? String(rule.max) : "",
      };
    }
    setDraft(next);
    setSeeded(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const thresholds: Partial<Record<DeviceChannel, DeviceThreshold>> = {};

      for (const meta of CHANNELS) {
        const entry = draft[meta.key];
        if (!entry) continue;

        const existing = device?.config?.thresholds?.[meta.key];
        thresholds[meta.key] = {
          min: parseBound(entry.min),
          max: parseBound(entry.max),
          // Hysteresis and the driven output are not exposed as fields. The
          // first is an engineering value nobody should have to reason about;
          // the second is a wiring fact, not a preference. Both are preserved
          // from whatever the device already holds.
          hysteresis: existing?.hysteresis,
          drives: existing?.drives ?? null,
        };
      }

      return updateDeviceConfig(deviceId, { thresholds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
      notify("Saved", "The device will pick up the new limits within a minute.");
    },
    onError: (error) => notify("Couldn't save", apiErrorMessage(error)),
  });

  if (deviceQuery.isPending) return <LoadingView />;
  if (deviceQuery.isError) {
    return <ErrorBanner message={apiErrorMessage(deviceQuery.error)} onRetry={deviceQuery.refetch} />;
  }
  if (!device) return null;

  const enabled = (device.config?.channels ?? []).filter((channel) => channel.enabled);
  const thresholds = device.config?.thresholds ?? {};

  return (
    <RefreshableScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Card style={styles.introCard}>
        <Text style={styles.introTitle}>When to raise the alarm</Text>
        <Text style={styles.introBody}>
          Leave a box empty for no limit. The device checks these itself, so alerts and the aerator keep
          working even when the internet is down.
        </Text>
      </Card>

      {enabled.length === 0 && (
        <Card style={styles.introCard}>
          <Text style={styles.introTitle}>No probes switched on</Text>
          <Text style={styles.introBody}>
            Turn on the probes you've fitted first — there's nothing to set limits on until then.
          </Text>
        </Card>
      )}

      {CHANNELS.filter((meta) => enabled.some((channel) => channel.type === meta.key)).map((meta) => {
        const entry = draft[meta.key] ?? { min: "", max: "" };
        const rule = thresholds[meta.key];
        const drives = rule?.drives;

        return (
          <Card key={meta.key} style={styles.channelCard}>
            <View style={styles.channelHeader}>
              <AppIcon name={meta.icon} size={16} color={colors.teal} />
              <Text style={styles.channelName}>{meta.label}</Text>
              {meta.unit ? <Text style={styles.channelUnit}>{meta.unit}</Text> : null}
            </View>

            {/*
              Surfaced rather than editable. Which relay a limit drives is
              determined by what's physically wired to the device, and letting
              someone point the oxygen limit at the valve from a phone is a way
              to break a raceway, not a feature.
            */}
            {drives && (
              <View style={styles.drivesRow}>
                <AppIcon name="zap" size={13} color={colors.success} />
                <Text style={styles.drivesText}>
                  Below the lower limit, the {OUTPUT_LABELS[drives].toLowerCase()} switches on
                  automatically.
                </Text>
              </View>
            )}

            <View style={styles.boundRow}>
              <FormField
                label="Warn below"
                value={entry.min}
                onChangeText={(text) =>
                  setDraft((prev) => ({ ...prev, [meta.key]: { ...entry, min: text } }))
                }
                keyboardType="decimal-pad"
                placeholder="No limit"
                style={styles.boundField}
              />
              <FormField
                label="Warn above"
                value={entry.max}
                onChangeText={(text) =>
                  setDraft((prev) => ({ ...prev, [meta.key]: { ...entry, max: text } }))
                }
                keyboardType="decimal-pad"
                placeholder="No limit"
                style={styles.boundField}
              />
            </View>
          </Card>
        );
      })}

      {enabled.length > 0 && (
        <PrimaryButton
          title="Save limits"
          style={styles.saveButton}
          loading={saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        />
      )}
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
  channelHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  channelName: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.ink },
  channelUnit: { fontSize: 12, color: colors.inkMuted, fontWeight: "700" },

  drivesRow: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  drivesText: { flex: 1, fontSize: 12, color: colors.success, lineHeight: 17, fontWeight: "600" },

  boundRow: { flexDirection: "row", gap: 12 },
  boundField: { flex: 1, marginBottom: 0 },

  saveButton: { marginHorizontal: 16, marginTop: 8 },
});
