import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { HatcheryStackParamList } from "../../navigation/types";
import { createHatcheryBatchSale, createHatcheryMortalityEntry, fetchHatcheryBatch } from "../../api/hatchery";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { useRefreshing } from "../../lib/useRefreshing";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<HatcheryStackParamList, "HatcheryBatchDetail">;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function HatcheryBatchDetailScreen({ route }: Props) {
  const { hatcheryBatchId } = route.params;
  const queryClient = useQueryClient();
  const detailQuery = useQuery({ queryKey: ["hatchery-batch", hatcheryBatchId], queryFn: () => fetchHatcheryBatch(hatcheryBatchId) });
  const { refreshing, onRefresh } = useRefreshing();

  const [mortalityCount, setMortalityCount] = useState("");
  const [mortalityDate, setMortalityDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleQty, setSaleQty] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [saleBuyer, setSaleBuyer] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["hatchery-batch", hatcheryBatchId] });
    queryClient.invalidateQueries({ queryKey: ["hatchery-batches"] });
  };

  const mortalityMutation = useMutation({
    mutationFn: () => createHatcheryMortalityEntry(hatcheryBatchId, { date: mortalityDate, count: Number(mortalityCount) }),
    onSuccess: () => {
      setMortalityCount("");
      invalidate();
    },
  });

  const saleMutation = useMutation({
    mutationFn: () =>
      createHatcheryBatchSale(hatcheryBatchId, {
        date: saleDate,
        quantity: Number(saleQty),
        pricePerPiece: Number(salePrice),
        buyerName: saleBuyer.trim() || undefined,
      }),
    onSuccess: () => {
      setSaleQty("");
      setSalePrice("");
      setSaleBuyer("");
      invalidate();
    },
  });

  if (detailQuery.isPending) return <LoadingView />;
  if (detailQuery.isError) return <ErrorBanner message={apiErrorMessage(detailQuery.error)} onRetry={detailQuery.refetch} />;

  const { batch, mortalityEntries, sales } = detailQuery.data;

  return (
    <RefreshableScrollView
      contentContainerStyle={styles.container}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{batch.stage}</Text>
        <Text style={styles.title}>{batch.species}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{batch.currentCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{batch.eggCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Initial eggs</Text>
          </View>
        </View>
        <View style={styles.dateRows}>
          {batch.strippingDate && <Text style={styles.dateRow}>Stripped {formatDate(batch.strippingDate)}</Text>}
          {batch.eyedDate && <Text style={styles.dateRow}>Eyed {formatDate(batch.eyedDate)}</Text>}
          {batch.hatchedDate && <Text style={styles.dateRow}>Hatched {formatDate(batch.hatchedDate)}</Text>}
          {batch.tray && <Text style={styles.dateRow}>Tray: {batch.tray.name}</Text>}
          {batch.broodstock && <Text style={styles.dateRow}>From broodstock: {batch.broodstock.species}</Text>}
        </View>
      </View>

      <Text style={styles.sectionTitle}>Mortality</Text>
      <Card style={styles.formCard}>
        {mortalityMutation.isError && <ErrorBanner message={apiErrorMessage(mortalityMutation.error)} />}
        <View style={styles.row}>
          <DateField label="Date" value={mortalityDate} onChange={setMortalityDate} style={styles.rowField} />
          <FormField label="Count" value={mortalityCount} onChangeText={setMortalityCount} keyboardType="numeric" placeholder="50" style={styles.rowField} />
        </View>
        <PrimaryButton
          title="Log mortality"
          variant="secondary"
          onPress={() => mortalityMutation.mutate()}
          loading={mortalityMutation.isPending}
          disabled={!(Number(mortalityCount) > 0 && mortalityDate)}
        />
      </Card>
      {mortalityEntries.map((entry) => (
        <View key={entry.id} style={styles.logRow}>
          <Text style={styles.logMeta}>{formatDate(entry.date)}</Text>
          <Text style={styles.logValue}>-{entry.count.toLocaleString()}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Sales</Text>
      <Card style={styles.formCard}>
        {saleMutation.isError && <ErrorBanner message={apiErrorMessage(saleMutation.error)} />}
        <View style={styles.row}>
          <FormField label="Quantity" value={saleQty} onChangeText={setSaleQty} keyboardType="numeric" placeholder="1000" style={styles.rowField} />
          <FormField label="Price per pc" value={salePrice} onChangeText={setSalePrice} keyboardType="numeric" placeholder="3.50" style={styles.rowField} />
        </View>
        <FormField label="Buyer (optional)" value={saleBuyer} onChangeText={setSaleBuyer} placeholder="Neighboring farm" />
        <DateField label="Date" value={saleDate} onChange={setSaleDate} />
        <PrimaryButton
          title="Log sale"
          variant="secondary"
          onPress={() => saleMutation.mutate()}
          loading={saleMutation.isPending}
          disabled={!(Number(saleQty) > 0 && Number(salePrice) > 0 && saleDate)}
        />
      </Card>
      {sales.map((sale) => (
        <View key={sale.id} style={styles.logRow}>
          <Text style={styles.logMeta}>
            {formatDate(sale.date)}{sale.buyerName ? ` · ${sale.buyerName}` : ""}
          </Text>
          <Text style={styles.logValue}>
            -{sale.quantity.toLocaleString()} · ₹{(sale.quantity * sale.pricePerPiece).toFixed(2)}
          </Text>
        </View>
      ))}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  hero: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20, marginBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: "800", color: "#BBD9D5", letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: "800", color: colors.white, marginTop: 4 },
  statsRow: { flexDirection: "row", gap: 24, marginTop: 14, borderTopWidth: 1, borderTopColor: "#2C5966", paddingTop: 12 },
  stat: { alignItems: "flex-start" },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.white },
  statLabel: { fontSize: 11, color: "#BBD9D5", marginTop: 2 },
  dateRows: { marginTop: 12 },
  dateRow: { fontSize: 12, color: "#D5E8E5", marginTop: 3 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ocean, marginTop: 16, marginBottom: 8 },
  formCard: { marginHorizontal: 0, marginBottom: 10 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  logRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  logMeta: { fontSize: 12, color: colors.inkMuted },
  logValue: { fontSize: 13, fontWeight: "700", color: colors.ink },
});
