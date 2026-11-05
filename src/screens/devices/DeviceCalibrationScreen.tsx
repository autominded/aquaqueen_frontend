import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BatchesStackParamList } from "../../navigation/types";
import { fetchDevice, sendDeviceCommand } from "../../api/devices";
import { apiErrorMessage } from "../../api/client";
import { CALIBRATION_STEPS, CHANNEL_BY_KEY } from "../../lib/deviceChannels";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "DeviceCalibration">;

/**
 * Two-point calibration wizard for pH, dissolved oxygen and ammonia.
 *
 * These probes drift — a pH electrode measurably within a season, an ammonia
 * ISE faster — and an uncalibrated one reports numbers that look precise and
 * are wrong. Wrong in the confident direction is worse than missing, because
 * someone acts on it.
 *
 * The firmware holds the first point in RAM only and computes the slope when
 * the second arrives (see aq_sensors_calibrate_point). So an abandoned
 * half-calibration leaves nothing behind, and this screen can be walked away
 * from safely at any point.
 */
export function DeviceCalibrationScreen({ route, navigation }: Props) {
  const { deviceId, channel } = route.params;
  const queryClient = useQueryClient();

  const meta = CHANNEL_BY_KEY[channel];
  const steps = CALIBRATION_STEPS[channel] ?? [];

  const [stepIndex, setStepIndex] = useState(0);
  const [value, setValue] = useState(String(steps[0]?.suggestedValue ?? ""));
  const [captured, setCaptured] = useState<string[]>([]);

  const deviceQuery = useQuery({
    queryKey: ["device", deviceId],
    queryFn: () => fetchDevice(deviceId, 1),
  });

  const captureMutation = useMutation({
    mutationFn: (input: { point: 0 | 1; known: number }) =>
      sendDeviceCommand(deviceId, {
        cmd: "calibrate",
        channel,
        point: input.point,
        known_value: input.known,
      }),
    onSuccess: (_result, input) => {
      setCaptured((prev) => [...prev, `Point ${input.point + 1} captured`]);

      if (stepIndex + 1 < steps.length) {
        const next = stepIndex + 1;
        setStepIndex(next);
        setValue(String(steps[next].suggestedValue));
      } else {
        queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
        setStepIndex(steps.length); // done
      }
    },
  });

  if (deviceQuery.isPending) return <LoadingView />;
  if (deviceQuery.isError) {
    return <ErrorBanner message={apiErrorMessage(deviceQuery.error)} onRetry={deviceQuery.refetch} />;
  }

  const device = deviceQuery.data?.device;
  if (!device) return null;

  // Calibration reads the probe live, so unlike a config change this genuinely
  // cannot be queued for later.
  if (!device.online) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.title}>Device is offline</Text>
          <Text style={styles.body}>
            Calibration reads the probe as you dip it, so the device has to be connected. Check it's
            powered and on the farm's Wi-Fi, then come back.
          </Text>
          <PrimaryButton title="Go back" variant="secondary" onPress={() => navigation.goBack()} />
        </Card>
      </ScrollView>
    );
  }

  const finished = stepIndex >= steps.length;
  const step = steps[stepIndex];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.progressRow}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[styles.progressSegment, index < stepIndex && styles.progressSegmentDone]}
          />
        ))}
      </View>

      {finished ? (
        <Card style={styles.card}>
          <View style={styles.successBadge}>
            <AppIcon name="check" size={20} color={colors.success} />
          </View>
          <Text style={styles.title}>{meta.label} calibrated</Text>
          <Text style={styles.body}>
            Readings from now on use the new calibration. Rinse the probe in clean water before putting
            it back in the raceway, so buffer solution doesn't go in with it.
          </Text>
          <Text style={styles.hint}>
            Worth redoing each season — these probes drift, and a drifting one reports a crisis that
            isn't there until people stop believing it.
          </Text>
          <PrimaryButton title="Done" onPress={() => navigation.goBack()} />
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.stepCount}>
            Step {stepIndex + 1} of {steps.length}
          </Text>
          <Text style={styles.title}>{meta.label}</Text>
          <Text style={styles.body}>{step.instruction}</Text>

          <FormField
            label={step.valueLabel}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
          />
          {/*
            Prefilled with the standard value for this point, because that's
            what's on the bottle 95% of the time — but editable, since buffer
            solutions come in other strengths and using the wrong number here
            silently skews every reading afterwards.
          */}
          <Text style={styles.hint}>
            Change this if your solution says something different — the number printed on the bottle is
            what matters, not the usual one.
          </Text>

          {captureMutation.isError && (
            <Text style={styles.error}>{apiErrorMessage(captureMutation.error)}</Text>
          )}

          {captured.map((line) => (
            <View key={line} style={styles.capturedRow}>
              <AppIcon name="check" size={14} color={colors.success} />
              <Text style={styles.capturedText}>{line}</Text>
            </View>
          ))}

          <PrimaryButton
            title={stepIndex + 1 === steps.length ? "Capture & finish" : "Capture this point"}
            loading={captureMutation.isPending}
            disabled={!value.trim() || Number.isNaN(Number(value))}
            onPress={() =>
              captureMutation.mutate({ point: step.point, known: Number(value) })
            }
          />
          <PrimaryButton
            title="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingVertical: 20, paddingBottom: 40 },

  progressRow: { flexDirection: "row", gap: 6, paddingHorizontal: 16, marginBottom: 16 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressSegmentDone: { backgroundColor: colors.teal },

  card: { gap: 12 },
  stepCount: { fontSize: 11, fontWeight: "800", color: colors.teal, letterSpacing: 0.6 },
  title: { fontSize: 18, fontWeight: "800", color: colors.ocean },
  body: { fontSize: 14, color: colors.inkMuted, lineHeight: 21 },
  hint: { fontSize: 12, color: colors.inkMuted, lineHeight: 18, marginTop: -4 },
  error: { fontSize: 13, color: colors.coral, lineHeight: 18 },

  capturedRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  capturedText: { fontSize: 13, fontWeight: "700", color: colors.success },

  successBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
});
