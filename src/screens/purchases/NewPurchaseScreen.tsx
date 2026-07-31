import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { createPurchase, uploadPurchaseReceipt } from "../../api/purchases";
import { createBatch } from "../../api/batches";
import { createFarmInventoryEntry, createFarmInventoryItem, fetchFarmInventoryItems } from "../../api/farmInventory";
import { fetchFarm } from "../../api/farm";
import { fetchContacts } from "../../api/contacts";
import { fetchAccounts } from "../../api/accounts";
import { fetchFeedManufacturers, fetchPelletSizes } from "../../api/feedCatalog";
import { fetchSpecies } from "../../api/species";
import { BatchStage, PurchaseCategory } from "../../api/types";
import { PURCHASE_CATEGORIES, CATEGORY_LABEL } from "./categories";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { PaymentLine, PaymentSplitEditor } from "../../components/PaymentSplitEditor";
import { FeedItemLine, FeedItemsEditor } from "../../components/FeedItemsEditor";
import { RacewayAllocationEditor, RacewayAllocationLine } from "../../components/RacewayAllocationEditor";
import { ReceiptDraft, ReceiptPicker } from "../../components/ReceiptPicker";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { useUnits } from "../../context/UnitsContext";
import { notify } from "../../lib/notify";

type Props = NativeStackScreenProps<PurchasesStackParamList, "NewPurchase">;

const BATCH_STAGES: { value: BatchStage; label: string }[] = [
  { value: "FINGERLING", label: "Fingerling" },
  { value: "JUVENILE", label: "Juvenile" },
  { value: "ADULT", label: "Adult" },
  { value: "BROODER", label: "Brooder" },
];

export function NewPurchaseScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { massUnitLabel, fromDisplayMass, weightUnitLabel, fromDisplayWeight } = useUnits();
  const contactsQuery = useQuery({ queryKey: ["contacts", "SUPPLIER"], queryFn: () => fetchContacts("SUPPLIER") });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const manufacturersQuery = useQuery({ queryKey: ["feed-manufacturers"], queryFn: fetchFeedManufacturers });
  const pelletSizesQuery = useQuery({ queryKey: ["pellet-sizes"], queryFn: fetchPelletSizes });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });
  const speciesQuery = useQuery({ queryKey: ["species"], queryFn: fetchSpecies });
  const farmInventoryQuery = useQuery({ queryKey: ["farm-inventory"], queryFn: fetchFarmInventoryItems });

  const [category, setCategory] = useState<PurchaseCategory>("FEED");
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [feedManufacturerId, setFeedManufacturerId] = useState<string | undefined>(undefined);
  const [feedItems, setFeedItems] = useState<FeedItemLine[]>([]);
  // Empty, not defaulted to today — a real value here (vs. a greyed
  // placeholder) is indistinguishable from something the user actually
  // typed, which reads as "did I already fill this in?" on a form this long.
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<ReceiptDraft | null>(null);

  // Seed/fingerling purchases can spin up the batch they're stocking in the
  // same flow — a tick-box convenience, not a persisted purchase↔batch link.
  const [createBatchToo, setCreateBatchToo] = useState(false);
  const [batchCode, setBatchCode] = useState("");
  const [batchSpecies, setBatchSpecies] = useState("");
  const [batchStage, setBatchStage] = useState<BatchStage>("FINGERLING");
  const [batchAvgWeight, setBatchAvgWeight] = useState("");
  const [batchLocation, setBatchLocation] = useState("");
  const [racewayLines, setRacewayLines] = useState<RacewayAllocationLine[]>([]);

  // Non-feed, non-seed purchases (equipment, chemicals, packaging, etc.) can
  // log straight into the farm's equipment/supplies register in the same
  // flow — same tick-box convenience as the batch toggle above, not a
  // persisted purchase↔inventory-entry link.
  const [trackInventoryToo, setTrackInventoryToo] = useState(false);
  const [inventoryItemId, setInventoryItemId] = useState<string | undefined>(undefined);
  const [addingInventoryItem, setAddingInventoryItem] = useState(false);
  const [newInventoryItemName, setNewInventoryItemName] = useState("");

  const accounts = accountsQuery.data ?? [];
  const pelletSizes = pelletSizesQuery.data ?? [];
  const raceways = farmQuery.data?.raceways ?? [];
  const farmInventoryItems = farmInventoryQuery.data ?? [];
  const isFeed = category === "FEED";
  const isSeed = category === "FINGERLINGS_EGGS";
  const canTrackInventory = !isFeed && !isSeed;

  // Default to the first pellet size once the catalog loads, if nothing's
  // been picked yet.
  useEffect(() => {
    if (isFeed && feedItems.length === 0 && pelletSizes[0]) {
      setFeedItems([{ pelletSizeId: pelletSizes[0].id, bagWeight: "", numberOfBags: "", ratePerBag: "" }]);
    }
  }, [isFeed, pelletSizes.length]);

  const feedTotal = feedItems.reduce((sum, l) => sum + (Number(l.numberOfBags) || 0) * (Number(l.ratePerBag) || 0), 0);
  const estimatedTotal = isFeed
    ? feedTotal
    : Number(quantity) > 0 && Number(unitCost) > 0
      ? Number(quantity) * Number(unitCost)
      : 0;

  // Keep a single default payment row tracking the live total; once split
  // into more than one row, the user's manual amounts take over.
  useEffect(() => {
    if (payments.length <= 1 && accounts[0]) {
      setPayments([{ accountId: payments[0]?.accountId ?? accounts[0].id, amount: estimatedTotal > 0 ? String(estimatedTotal) : "" }]);
    }
  }, [estimatedTotal, accounts.length]);

  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paymentsWithinTotal = estimatedTotal > 0 && paymentsTotal <= estimatedTotal + 0.01;
  const isFullyPaid = paymentsWithinTotal && Math.abs(paymentsTotal - estimatedTotal) < 0.01;
  const remaining = Math.max(0, Math.round((estimatedTotal - paymentsTotal) * 100) / 100);

  const validFeedItems = feedItems.filter(
    (l) => l.pelletSizeId && Number(l.bagWeight) > 0 && Number(l.numberOfBags) > 0 && Number(l.ratePerBag) > 0
  );

  const wantsBatch = isSeed && createBatchToo;

  // Default to one line against the first raceway once the toggle is on, if
  // nothing's been picked yet — same convention as NewBatchScreen.
  useEffect(() => {
    if (wantsBatch && raceways.length > 0 && racewayLines.length === 0) {
      setRacewayLines([{ racewayId: raceways[0].id, count: "" }]);
    }
  }, [wantsBatch, raceways.length]);

  const wantsInventory = canTrackInventory && trackInventoryToo;
  const inventoryValid = Boolean(addingInventoryItem ? newInventoryItemName.trim() : inventoryItemId);

  const validRacewayLines = racewayLines.filter((l) => l.racewayId && Number(l.count) > 0);
  const allocatedCount = validRacewayLines.reduce((sum, l) => sum + Number(l.count), 0);
  const batchValid = Boolean(
    batchCode &&
      batchSpecies &&
      Number(batchAvgWeight) > 0 &&
      (raceways.length > 0
        ? validRacewayLines.length === racewayLines.length && racewayLines.length > 0 && allocatedCount === Number(quantity)
        : batchLocation)
  );

  const mutation = useMutation({
    mutationFn: () =>
      createPurchase({
        contactId,
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({ accountId: p.accountId, amount: Number(p.amount) })),
        category,
        ...(isFeed
          ? {
              feedManufacturerId,
              items: validFeedItems.map((l) => ({
                pelletSizeId: l.pelletSizeId,
                bagWeightKg: fromDisplayMass(Number(l.bagWeight)),
                numberOfBags: Number(l.numberOfBags),
                ratePerBag: Number(l.ratePerBag),
              })),
            }
          : {
              // Every non-feed category is counted per piece — the server
              // synthesizes "pcs", same as it does "bags" for FEED, so no
              // unit is sent from the client.
              quantity: Number(quantity),
              unitCost: Number(unitCost),
            }),
        purchaseDate,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async (purchase) => {
      if (receipt) {
        try {
          await uploadPurchaseReceipt(purchase.id, receipt);
        } catch {
          // The purchase itself is already saved — surface the receipt
          // failure separately rather than implying the whole save failed.
          notify("Purchase saved", "The receipt couldn't be uploaded. You can attach it from Edit purchase.");
        }
      }
      if (wantsBatch) {
        try {
          await createBatch({
            code: batchCode.trim(),
            species: batchSpecies.trim(),
            stage: batchStage,
            startDate: purchaseDate,
            initialCount: Number(quantity),
            initialAvgWeightG: fromDisplayWeight(Number(batchAvgWeight)),
            ...(raceways.length > 0
              ? { stockings: validRacewayLines.map((l) => ({ racewayId: l.racewayId, count: Number(l.count) })) }
              : { location: batchLocation.trim() }),
          });
          queryClient.invalidateQueries({ queryKey: ["batches"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
        } catch (err) {
          // Same graceful-degradation approach as the receipt upload above —
          // the purchase is already saved either way.
          notify("Purchase saved", `The batch couldn't be created: ${apiErrorMessage(err)}. You can create it from Operations.`);
        }
      }
      if (wantsInventory) {
        try {
          const itemId = addingInventoryItem
            ? (await createFarmInventoryItem(newInventoryItemName.trim())).id
            : inventoryItemId!;
          await createFarmInventoryEntry(itemId, {
            quantity: Number(quantity),
            purchasePrice: Number(unitCost),
            date: purchaseDate,
            notes: notes.trim() || undefined,
          });
          queryClient.invalidateQueries({ queryKey: ["farm-inventory"] });
          queryClient.invalidateQueries({ queryKey: ["farm-inventory-entries", itemId] });
        } catch (err) {
          // Same graceful-degradation approach as the receipt/batch handling
          // above — the purchase is already saved either way.
          notify("Purchase saved", `Stock couldn't be added to inventory: ${apiErrorMessage(err)}. You can add it from Farm inventory.`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      navigation.goBack();
    },
  });

  const canSubmit = Boolean(
    purchaseDate &&
      paymentsWithinTotal &&
      (isFullyPaid || !!contactId) &&
      (isFeed
        ? feedManufacturerId && validFeedItems.length > 0 && validFeedItems.length === feedItems.length
        : Number(quantity) > 0 && Number(unitCost) > 0) &&
      (!wantsBatch || batchValid) &&
      (!wantsInventory || inventoryValid)
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <SelectField
        label="Category"
        value={category}
        onSelect={(v) => setCategory(v as PurchaseCategory)}
        options={PURCHASE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
      />

      {isFeed ? (
        <>
          {manufacturersQuery.data?.length === 0 && (
            <Text style={styles.hint}>No manufacturers configured yet — add them from the super admin Feed catalog screen.</Text>
          )}
          <SelectField
            label="Feed manufacturer"
            value={feedManufacturerId ?? null}
            onSelect={setFeedManufacturerId}
            placeholder="Select a manufacturer"
            options={(manufacturersQuery.data ?? []).map((m) => ({ value: m.id, label: m.name }))}
          />

          <Text style={styles.label}>Pellet sizes</Text>
          <FeedItemsEditor pelletSizes={pelletSizes} lines={feedItems} onChange={setFeedItems} weightUnitLabel={massUnitLabel} />
        </>
      ) : (
        <View style={styles.row}>
          <FormField
            label={isSeed ? "No. of fingerlings" : "Quantity"}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder={isSeed ? "5000" : "20"}
            style={styles.rowField}
          />
          <FormField
            label={isSeed ? "Per pc cost" : "Cost per pc"}
            value={unitCost}
            onChangeText={setUnitCost}
            keyboardType="numeric"
            placeholder="2.50"
            style={styles.rowField}
          />
          <FormField
            label="Total"
            value={estimatedTotal > 0 ? `₹${estimatedTotal.toFixed(2)}` : ""}
            editable={false}
            placeholder="₹0.00"
            style={styles.rowField}
          />
        </View>
      )}

      {isSeed && (
        <>
          <Text style={styles.label}>Batch</Text>
          <View style={styles.chipRow}>
            <PrimaryButton
              title="Create a batch for this purchase"
              variant={createBatchToo ? "primary" : "secondary"}
              onPress={() => setCreateBatchToo((v) => !v)}
              style={styles.batchToggle}
            />
          </View>

          {createBatchToo && (
            <>
              <FormField label="Batch code" value={batchCode} onChangeText={setBatchCode} placeholder="B-002" autoCapitalize="characters" />

              <SelectField
                label="Species"
                value={batchSpecies || null}
                onSelect={setBatchSpecies}
                placeholder={speciesQuery.data?.length ? "Select a species" : "No species set up yet"}
                options={(speciesQuery.data ?? []).map((s) => ({ value: s.name, label: s.name }))}
              />

              <SelectField
                label="Stage"
                value={batchStage}
                onSelect={(v) => setBatchStage(v as BatchStage)}
                options={BATCH_STAGES}
              />

              <FormField
                label={`Avg weight per fish (${weightUnitLabel})`}
                value={batchAvgWeight}
                onChangeText={setBatchAvgWeight}
                placeholder="0.2"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Location</Text>
              {raceways.length === 0 ? (
                <FormField label="Location" value={batchLocation} onChangeText={setBatchLocation} placeholder="Pond 3" />
              ) : (
                <RacewayAllocationEditor
                  raceways={raceways}
                  lines={racewayLines}
                  onChange={setRacewayLines}
                  targetCount={Number(quantity) || 0}
                />
              )}
            </>
          )}
        </>
      )}

      {canTrackInventory && (
        <>
          <Text style={styles.label}>Farm inventory</Text>
          <View style={styles.chipRow}>
            <PrimaryButton
              title="Track in farm inventory"
              variant={trackInventoryToo ? "primary" : "secondary"}
              onPress={() => setTrackInventoryToo((v) => !v)}
              style={styles.batchToggle}
            />
          </View>

          {trackInventoryToo && (
            <>
              {addingInventoryItem ? (
                <FormField label="New item name" value={newInventoryItemName} onChangeText={setNewInventoryItemName} placeholder="Aerator pump" />
              ) : (
                <SelectField
                  label="Inventory item"
                  value={inventoryItemId ?? null}
                  onSelect={setInventoryItemId}
                  placeholder={farmInventoryItems.length ? "Select an item" : "No items set up yet"}
                  options={farmInventoryItems.map((i) => ({ value: i.id, label: i.name }))}
                />
              )}
              <TouchableOpacity
                onPress={() => {
                  setAddingInventoryItem((v) => !v);
                  setInventoryItemId(undefined);
                  setNewInventoryItemName("");
                }}
              >
                <Text style={styles.addSupplierLink}>{addingInventoryItem ? "Choose an existing item instead" : "+ Add a new inventory item"}</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      )}

      <DateField label="Purchase date" value={purchaseDate} onChange={setPurchaseDate} />

      <Text style={styles.label}>Paid from</Text>
      <PaymentSplitEditor accounts={accounts} total={estimatedTotal} payments={payments} onChange={setPayments} />
      {!isFullyPaid && remaining > 0 && (
        <Text style={styles.dueNote}>₹{remaining.toFixed(2)} will be recorded as owed to the supplier — a supplier is required.</Text>
      )}

      <SelectField
        label={`Supplier${isFullyPaid ? " (optional)" : ""}`}
        value={contactId ?? null}
        onSelect={setContactId}
        placeholder={isFullyPaid ? "None" : "Select a supplier"}
        options={(contactsQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
      />
      <TouchableOpacity onPress={() => navigation.navigate("NewContact")}>
        <Text style={styles.addSupplierLink}>+ Add a new supplier</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Receipt (optional)</Text>
      <ReceiptPicker draft={receipt} onPick={setReceipt} onRemove={receipt ? () => setReceipt(null) : undefined} />

      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />

      <PrimaryButton title="Log purchase" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  hint: { fontSize: 12, color: "#7a8787", marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, minWidth: 90 },
  batchToggle: { paddingHorizontal: 14 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  dueNote: { fontSize: 12, color: "#b9770e", marginBottom: 12 },
  addSupplierLink: { fontSize: 13, fontWeight: "700", color: "#0b6e6e", marginBottom: 16 },
});
