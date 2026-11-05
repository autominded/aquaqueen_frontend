import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createHatcheryRaceway,
  deleteHatcheryRaceway,
  fetchHatcheryRaceways,
  updateHatcheryRaceway,
} from "../../api/hatcheryRaceways";
import { HatcheryRaceway } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { confirmAction } from "../../lib/confirm";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { useUnits } from "../../context/UnitsContext";
import { colors } from "../../theme";

// Mirrors HATCHERY_RACEWAY_MAX_M on the server, which is the real boundary —
// this just avoids a round-trip to be told a hatchery trough can't be 40 m.
// Held in metres because that's what the server validates; the form converts
// it into whatever unit the user is working in.
const MAX_M = 15;

// Reference dimensions for a typical hatchery trough, in metres. Converted
// before display, so the placeholder matches the unit on screen rather than
// always reading like metres.
const PLACEHOLDER_M = { lengthM: 3, widthM: 0.8, depthM: 0.4 };

const BLANK = { name: "", lengthM: "", widthM: "", depthM: "" };

type Draft = typeof BLANK;

export function HatcheryRacewaysScreen() {
  const queryClient = useQueryClient();
  // Dimensions follow the app-wide length unit (Profile → Units, which starts
  // from the platform default set in the admin panel), exactly like Farm
  // setup and the raceway cards — always stored in metres regardless.
  const { lengthUnitLabel, formatLength, toDisplayLength, fromDisplayLength } = useUnits();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["hatchery-raceways"],
    queryFn: fetchHatcheryRaceways,
  });
  const { refreshing, onRefresh } = useRefreshing();

  const [draft, setDraft] = useState<Draft>(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(BLANK);

  const maxInDisplayUnit = toDisplayLength(MAX_M);

  // Everything typed here is in the user's chosen unit; null means "not a
  // usable dimension yet", which drives both the inline error and submit.
  const parseDimension = (raw: string): number | null => {
    const value = Number(raw.trim());
    if (!raw.trim() || !Number.isFinite(value)) return null;
    return value > 0 && value <= maxInDisplayUnit ? value : null;
  };

  const draftToInput = (d: Draft) => ({
    name: d.name.trim(),
    lengthM: fromDisplayLength(parseDimension(d.lengthM)!),
    widthM: fromDisplayLength(parseDimension(d.widthM)!),
    depthM: fromDisplayLength(parseDimension(d.depthM)!),
  });

  const isComplete = (d: Draft) =>
    !!d.name.trim() &&
    parseDimension(d.lengthM) !== null &&
    parseDimension(d.widthM) !== null &&
    parseDimension(d.depthM) !== null;

  // Only complain about a dimension the user has actually typed into.
  const dimensionError = (raw: string) =>
    raw.trim() && parseDimension(raw) === null ? `Up to ${Math.round(maxInDisplayUnit)} ${lengthUnitLabel}` : undefined;

  // Rounded so a converted value doesn't render as 0.8000000000000001.
  const round2 = (value: number) => Math.round(value * 100) / 100;

  // Deliberately a plain function rather than a nested component: a
  // component declared inside this body would be a new type on every
  // render, remounting the inputs and dropping focus after each keystroke.
  const renderDimensionFields = (d: Draft, onChange: (next: Draft) => void) => (
    <View style={styles.dimensionRow}>
      <FormField
        label={`Length (${lengthUnitLabel})`}
        value={d.lengthM}
        onChangeText={(lengthM) => onChange({ ...d, lengthM })}
        keyboardType="decimal-pad"
        placeholder={String(round2(toDisplayLength(PLACEHOLDER_M.lengthM)))}
        error={dimensionError(d.lengthM)}
        style={styles.dimensionField}
      />
      <FormField
        label={`Width (${lengthUnitLabel})`}
        value={d.widthM}
        onChangeText={(widthM) => onChange({ ...d, widthM })}
        keyboardType="decimal-pad"
        placeholder={String(round2(toDisplayLength(PLACEHOLDER_M.widthM)))}
        error={dimensionError(d.widthM)}
        style={styles.dimensionField}
      />
      <FormField
        label={`Depth (${lengthUnitLabel})`}
        value={d.depthM}
        onChangeText={(depthM) => onChange({ ...d, depthM })}
        keyboardType="decimal-pad"
        placeholder={String(round2(toDisplayLength(PLACEHOLDER_M.depthM)))}
        error={dimensionError(d.depthM)}
        style={styles.dimensionField}
      />
    </View>
  );

  // Broodstock reads its raceway list from the same endpoint, so a new or
  // removed hatchery raceway has to show up there without a manual refresh.
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["hatchery-raceways"] });
    queryClient.invalidateQueries({ queryKey: ["broodstocks"] });
  };

  const createMutation = useMutation({
    mutationFn: () => createHatcheryRaceway(draftToInput(draft)),
    onSuccess: () => {
      setDraft(BLANK);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateHatcheryRaceway(editingId!, draftToInput(editingDraft)),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHatcheryRaceway(id),
    onSuccess: invalidate,
  });

  const startEditing = (raceway: HatcheryRaceway) => {
    setEditingId(raceway.id);
    // Seeded in the display unit, since that's what the fields are labelled
    // in — converted back to metres on save.
    setEditingDraft({
      name: raceway.name,
      lengthM: String(round2(toDisplayLength(raceway.lengthM))),
      widthM: String(round2(toDisplayLength(raceway.widthM))),
      depthM: String(round2(toDisplayLength(raceway.depthM))),
    });
  };

  const confirmDelete = (raceway: HatcheryRaceway) => {
    confirmAction(
      {
        title: "Remove raceway?",
        message: `"${raceway.name}" will no longer be available for broodstock.`,
        confirmLabel: "Remove",
        destructive: true,
      },
      () => deleteMutation.mutate(raceway.id)
    );
  };

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={styles.sectionTitle}>Hatchery raceways</Text>
      <Text style={styles.hint}>
        Troughs and broodstock tanks in the hatchery. Smaller than the grow-out raceways in Farm setup, and kept out of
        the Operations grid.
      </Text>

      {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
      <FormField
        label="Raceway name"
        value={draft.name}
        onChangeText={(name) => setDraft({ ...draft, name })}
        placeholder="HR-01"
        style={styles.addField}
      />
      {renderDimensionFields(draft, setDraft)}
      <PrimaryButton
        title="Add raceway"
        onPress={() => createMutation.mutate()}
        loading={createMutation.isPending}
        disabled={!isComplete(draft)}
        style={styles.addButton}
      />

      {isPending && <LoadingView />}
      {isError && <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />}
      {data?.length === 0 && (
        <EmptyState title="No hatchery raceways yet" subtitle="Add one above to house broodstock." />
      )}
      {updateMutation.isError && <ErrorBanner message={apiErrorMessage(updateMutation.error)} />}
      {deleteMutation.isError && <ErrorBanner message={apiErrorMessage(deleteMutation.error)} />}

      {data?.map((raceway) =>
        editingId === raceway.id ? (
          <Card key={raceway.id} style={styles.editCard}>
            <FormField
              label="Raceway name"
              value={editingDraft.name}
              onChangeText={(name) => setEditingDraft({ ...editingDraft, name })}
            />
            {renderDimensionFields(editingDraft, setEditingDraft)}
            <View style={styles.editActions}>
              <PrimaryButton title="Cancel" variant="secondary" onPress={() => setEditingId(null)} style={styles.editButton} />
              <PrimaryButton
                title="Save"
                onPress={() => updateMutation.mutate()}
                loading={updateMutation.isPending}
                disabled={!isComplete(editingDraft)}
                style={styles.editButton}
              />
            </View>
          </Card>
        ) : (
          <Card key={raceway.id} style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowLabel}>{raceway.name}</Text>
              <Text style={styles.rowMeta}>
                {formatLength(raceway.lengthM)} × {formatLength(raceway.widthM)} × {formatLength(raceway.depthM)}
              </Text>
              <Text style={styles.rowMeta}>
                {raceway.broodstocks.length === 0
                  ? "Empty"
                  : raceway.broodstocks.map((b) => `${b.count.toLocaleString()} ${b.species}`).join(", ")}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity onPress={() => startEditing(raceway)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(raceway)}>
                <Text style={styles.removeLink}>Remove</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )
      )}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ocean, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: 12, lineHeight: 17 },
  addField: { marginBottom: 8 },
  addButton: { marginBottom: 16 },
  dimensionRow: { flexDirection: "row", gap: 8 },
  dimensionField: { flex: 1 },
  row: { marginHorizontal: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  rowCopy: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "700", color: colors.ink },
  rowMeta: { fontSize: 12, color: colors.inkMuted, marginTop: 3 },
  rowActions: { alignItems: "flex-end", gap: 10 },
  editLink: { fontSize: 12, fontWeight: "700", color: colors.teal },
  removeLink: { fontSize: 12, fontWeight: "700", color: colors.coral },
  editCard: { marginHorizontal: 0 },
  editActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  editButton: { flex: 1 },
});
