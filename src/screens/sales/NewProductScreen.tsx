import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalesStackParamList } from "../../navigation/types";
import { createProduct } from "../../api/pos";
import { fetchFarm } from "../../api/farm";
import { fetchRacewayOperations } from "../../api/batches";
import { ProductUnit } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AppIcon } from "../../components/AppIcon";
import { apiErrorMessage } from "../../api/client";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<SalesStackParamList, "NewProduct">;

const UNITS: ProductUnit[] = ["KG", "PIECE"];
const SALABLE_WEIGHT_G = 200;
const CUSTOM_PRESETS = ["Delivery charge", "Fish cleaning charge"];

export function NewProductScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });
  const raceways = farmQuery.data?.raceways ?? [];

  // "harvest" is the original raceway→batch flow, defaulting quantity from
  // real stock. "custom" is a flat, un-stocked line (delivery charge, fish
  // cleaning, or anything else) — no raceway/batch, just a name and price,
  // sold through the exact same product list + cart + checkout as a real
  // harvest instead of a separate mechanism.
  const [mode, setMode] = useState<"harvest" | "custom" | null>(null);

  const [racewayId, setRacewayId] = useState<string | undefined>(undefined);
  const [batchId, setBatchId] = useState<string | undefined>(undefined);
  const [currentCount, setCurrentCount] = useState<number | undefined>(undefined);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<ProductUnit>("KG");
  const [price, setPrice] = useState("");
  const [availableQty, setAvailableQty] = useState("");

  const racewayOpsQuery = useQuery({
    queryKey: ["raceway-operations", racewayId],
    queryFn: () => fetchRacewayOperations(racewayId!),
    enabled: mode === "harvest" && !!racewayId,
  });

  // Default "available quantity" from the batch's actual current stock —
  // fish count for PIECE, or count × latest sampled avg weight for KG —
  // rather than asking the user to work it out and type it in. Still a
  // plain editable field afterward, in case the estimate needs correcting.
  const avgWeightG = racewayOpsQuery.data?.latestSampling?.avgWeightG;
  const defaultQtyFor = (u: ProductUnit, count: number | undefined) => {
    if (count === undefined) return "";
    if (u === "PIECE") return String(count);
    return avgWeightG ? String(Math.round(((count * avgWeightG) / 1000) * 100) / 100) : "";
  };

  useEffect(() => {
    if (mode === "harvest" && !racewayId && raceways.length === 1) setRacewayId(raceways[0].id);
  }, [mode, racewayId, raceways.length]);

  useEffect(() => {
    if (mode === "harvest" && racewayId && !batchId && racewayOpsQuery.data?.stockings.length === 1) {
      const s = racewayOpsQuery.data.stockings[0];
      setBatchId(s.batch.id);
      setName(`${s.batch.species} — ${s.batch.code}`);
      setCurrentCount(s.currentCount);
      setAvailableQty(defaultQtyFor(unit, s.currentCount));
    }
  }, [mode, racewayId, batchId, racewayOpsQuery.data]);

  const selectBatch = (s: { batch: { id: string; code: string; species: string }; currentCount: number }) => {
    setBatchId(s.batch.id);
    setName(`${s.batch.species} — ${s.batch.code}`);
    setCurrentCount(s.currentCount);
    setAvailableQty(defaultQtyFor(unit, s.currentCount));
  };

  const changeUnit = (u: ProductUnit) => {
    setUnit(u);
    setAvailableQty(defaultQtyFor(u, currentCount));
  };

  const resetToModePicker = () => {
    setMode(null);
    setRacewayId(undefined);
    setBatchId(undefined);
    setCurrentCount(undefined);
    setName("");
    setUnit("KG");
    setPrice("");
    setAvailableQty("");
  };

  const changeSelection = () => {
    setRacewayId(undefined);
    setBatchId(undefined);
    setCurrentCount(undefined);
    setName("");
    setAvailableQty("");
  };

  const startCustom = () => {
    setMode("custom");
    setUnit("PIECE");
    setAvailableQty("999");
  };

  const mutation = useMutation({
    mutationFn: () =>
      createProduct({
        batchId,
        name: name.trim(),
        unit,
        price: Number(price),
        availableQty: Number(availableQty),
        avgWeightG: mode === "harvest" ? avgWeightG : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigation.goBack();
    },
  });

  const canSubmit = Boolean(
    (mode === "custom" || batchId) && name.trim() && Number(price) > 0 && Number(availableQty) > 0
  );

  if (farmQuery.isPending) return <LoadingView />;
  if (farmQuery.isError) return <ErrorBanner message={apiErrorMessage(farmQuery.error)} onRetry={farmQuery.refetch} />;

  // Step 0: how is this being listed — a real harvest, or a flat custom
  // charge (delivery, cleaning, anything else)?
  if (mode === null) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>What are you listing?</Text>
        <TouchableOpacity onPress={() => setMode("harvest")}>
          <Card style={styles.modeCard}>
            <View style={styles.modeIcon}><AppIcon name="anchor" size={18} color={colors.teal} /></View>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>From a harvest</Text>
              <Text style={styles.modeHint}>Pick a raceway and batch — quantity defaults from its current stock.</Text>
            </View>
            <AppIcon name="chevron-right" />
          </Card>
        </TouchableOpacity>
        <TouchableOpacity onPress={startCustom}>
          <Card style={styles.modeCard}>
            <View style={styles.modeIcon}><AppIcon name="tag" size={18} color={colors.teal} /></View>
            <View style={styles.modeCopy}>
              <Text style={styles.modeTitle}>Custom item</Text>
              <Text style={styles.modeHint}>Delivery charge, fish cleaning, or anything else — just a name and price.</Text>
            </View>
            <AppIcon name="chevron-right" />
          </Card>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (mode === "harvest" && raceways.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <EmptyState title="No raceways set up yet" subtitle="Add raceways in Farm setup before listing a harvest for sale." />
      </ScrollView>
    );
  }

  // Harvest step 1: pick a raceway (skipped if there's only one).
  if (mode === "harvest" && !racewayId) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Which raceway?</Text>
        <View style={styles.chipRow}>
          {raceways.map((r) => (
            <PrimaryButton key={r.id} title={r.name} variant="secondary" onPress={() => setRacewayId(r.id)} style={styles.chip} />
          ))}
        </View>
        <TouchableOpacity onPress={resetToModePicker}>
          <Text style={styles.changeLink}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Harvest step 2: pick a batch stocked in that raceway (skipped if there's only one).
  if (mode === "harvest" && !batchId) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        {racewayOpsQuery.isPending && <LoadingView />}
        {racewayOpsQuery.isError && (
          <ErrorBanner message={apiErrorMessage(racewayOpsQuery.error)} onRetry={racewayOpsQuery.refetch} />
        )}
        {racewayOpsQuery.data && (
          <>
            <Text style={styles.sectionTitle}>Which batch?</Text>
            {racewayOpsQuery.data.stockings.length === 0 ? (
              <EmptyState title="No batch stocked here" subtitle="Pick a different raceway." />
            ) : (
              <View style={styles.chipRow}>
                {racewayOpsQuery.data.stockings.map((s) => (
                  <PrimaryButton
                    key={s.batch.id}
                    title={`${s.batch.code} — ${s.batch.species}`}
                    variant="secondary"
                    onPress={() => selectBatch(s)}
                    style={styles.chip}
                  />
                ))}
              </View>
            )}
            <TouchableOpacity onPress={changeSelection}>
              <Text style={styles.changeLink}>Change raceway</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  // Custom item: no raceway/batch at all, just a name and price.
  if (mode === "custom") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

        <Text style={styles.presetHint}>Quick pick</Text>
        <View style={styles.chipRow}>
          {CUSTOM_PRESETS.map((p) => (
            <PrimaryButton key={p} title={p} variant={name === p ? "primary" : "secondary"} onPress={() => setName(p)} style={styles.chip} />
          ))}
        </View>

        <FormField label="Item name" value={name} onChangeText={setName} placeholder="Delivery charge" />
        <FormField label="Price" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="100" />
        <FormField
          label="Quantity available"
          value={availableQty}
          onChangeText={setAvailableQty}
          keyboardType="numeric"
          placeholder="999"
        />
        <Text style={styles.hint}>
          Defaults high so this stays listed for repeat use — lower it if this is a one-off.
        </Text>

        <PrimaryButton title="List for sale" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
        <TouchableOpacity onPress={resetToModePicker}>
          <Text style={styles.changeLink}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Harvest step 3: default product details from the selected batch, editable, price it.
  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Card style={styles.selectionCard}>
        <Text style={styles.selectionTitle}>{name}</Text>
        <Text style={styles.selectionMeta}>{raceways.find((r) => r.id === racewayId)?.name}</Text>
        <TouchableOpacity onPress={changeSelection}>
          <Text style={styles.changeLink}>Change raceway</Text>
        </TouchableOpacity>
      </Card>

      {avgWeightG != null && avgWeightG < SALABLE_WEIGHT_G && (
        <Text style={styles.notSalableWarning}>
          Avg. weight is {Math.round(avgWeightG)}g — under {SALABLE_WEIGHT_G}g, not yet a salable size.
        </Text>
      )}

      <FormField label="Product name" value={name} onChangeText={setName} placeholder="Rainbow Trout — B-001" />

      <Text style={styles.label}>Unit</Text>
      <View style={styles.unitRow}>
        {UNITS.map((u) => (
          <PrimaryButton
            key={u}
            title={u}
            variant={unit === u ? "primary" : "secondary"}
            onPress={() => changeUnit(u)}
            style={styles.unitButton}
          />
        ))}
      </View>

      <FormField
        label={`Price per ${unit === "KG" ? "kg" : "piece"}`}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholder="6.50"
      />
      <FormField
        label={`Available quantity (${unit === "KG" ? "kg" : "pieces"})`}
        value={availableQty}
        onChangeText={setAvailableQty}
        keyboardType="numeric"
        placeholder="120"
      />

      <PrimaryButton title="List for sale" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ocean, marginBottom: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { minWidth: 120 },
  changeLink: { fontSize: 13, fontWeight: "700", color: colors.teal, marginTop: 12 },
  selectionCard: { marginHorizontal: 0, borderWidth: 1, borderColor: colors.teal },
  selectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  selectionMeta: { fontSize: 13, color: colors.inkMuted, marginTop: 3 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  unitRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  unitButton: { flex: 1 },
  notSalableWarning: { fontSize: 12, fontWeight: "700", color: colors.amber, backgroundColor: colors.amberSoft, borderRadius: radii.sm, padding: 10, marginBottom: 16 },
  modeCard: { marginHorizontal: 0, flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: colors.border },
  modeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tealSoft, alignItems: "center", justifyContent: "center" },
  modeCopy: { flex: 1 },
  modeTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  modeHint: { fontSize: 12, color: colors.inkMuted, marginTop: 3, lineHeight: 16 },
  presetHint: { fontSize: 12, fontWeight: "700", color: colors.inkMuted, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.inkMuted, marginBottom: 16, lineHeight: 16, marginTop: -8 },
});
