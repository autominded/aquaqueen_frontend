import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { BatchesStackParamList } from "../../navigation/types";
import { fetchDevice, updateDevice } from "../../api/devices";
import { fetchDashboardRaceways } from "../../api/dashboard";
import { apiErrorMessage } from "../../api/client";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { SelectField } from "../../components/SelectField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { notify } from "../../lib/notify";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<BatchesStackParamList, "DeviceSettings">;

export function DeviceSettingsScreen({ route, navigation }: Props) {
  const { deviceId } = route.params;
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [racewayId, setRacewayId] = useState<string | undefined>();
  const [seeded, setSeeded] = useState(false);

  const deviceQuery = useQuery({
    queryKey: ["device", deviceId],
    queryFn: () => fetchDevice(deviceId, 1),
  });
  const racewaysQuery = useQuery({ queryKey: ["dashboard-raceways"], queryFn: fetchDashboardRaceways });

  const device = deviceQuery.data?.device;

  // Seed once, guarded, so a background refetch can't overwrite an edit in
  // progress — the same shape as EditSaleScreen and RoleFormScreen.
  if (device && !seeded) {
    setName(device.name);
    setRacewayId(device.raceway?.id);
    setSeeded(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => updateDevice(deviceId, { name: name.trim(), racewayId: racewayId ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["device", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      notify("Saved");
      navigation.goBack();
    },
    onError: (error) => notify("Couldn't save", apiErrorMessage(error)),
  });

  if (deviceQuery.isPending) return <LoadingView />;
  if (deviceQuery.isError) {
    return <ErrorBanner message={apiErrorMessage(deviceQuery.error)} onRetry={deviceQuery.refetch} />;
  }
  if (!device) return null;

  const movingRaceway = !!device.raceway && racewayId !== device.raceway.id;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <FormField label="Name" value={name} onChangeText={setName} placeholder="Raceway 3 monitor" />

        <SelectField
          label="Raceway"
          value={racewayId}
          options={(racewaysQuery.data ?? []).map((raceway) => ({
            label: raceway.name,
            value: raceway.id,
          }))}
          onSelect={setRacewayId}
          placeholder="Not assigned"
        />

        {/*
          Moving a device between raceways is routine — probes get swapped
          around a farm constantly — so it's a plain edit, not a re-claim. But
          it does split the history, and someone reading a raceway's water
          quality chart six months later deserves to know why it changes shape.
        */}
        {movingRaceway && (
          <Text style={styles.warning}>
            Readings already recorded against {device.raceway?.name} stay with it. New readings will go
            to the raceway you pick here.
          </Text>
        )}

        <PrimaryButton
          title="Save"
          loading={saveMutation.isPending}
          disabled={!name.trim()}
          onPress={() => saveMutation.mutate()}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.metaTitle}>Hardware</Text>
        <Text style={styles.metaLine}>Serial · {device.deviceId}</Text>
        <Text style={styles.metaLine}>Firmware · {device.firmwareVersion ?? "Unknown"}</Text>
        <Text style={styles.metaLine}>
          Added · {new Date(device.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.metaHint}>
          Quote the serial if you need to contact support about this device.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { paddingVertical: 16, paddingBottom: 40 },
  card: { gap: 4 },
  warning: { fontSize: 12, color: colors.amber, lineHeight: 18, marginBottom: 8 },
  metaTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, marginBottom: 6 },
  metaLine: { fontSize: 13, color: colors.inkMuted, lineHeight: 20 },
  metaHint: { fontSize: 12, color: colors.inkMuted, marginTop: 8, lineHeight: 17 },
});
