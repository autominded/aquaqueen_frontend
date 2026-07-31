import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { deletePurchaseReceipt, fetchPurchases, updatePurchase, uploadPurchaseReceipt } from "../../api/purchases";
import { fetchContacts } from "../../api/contacts";
import { fetchFeedManufacturers, fetchPelletSizes } from "../../api/feedCatalog";
import { PurchaseCategory } from "../../api/types";
import { PURCHASE_CATEGORIES, CATEGORY_LABEL } from "./categories";
import { LoadingView } from "../../components/LoadingView";
import { EmptyState } from "../../components/EmptyState";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { FeedItemLine, FeedItemsEditor } from "../../components/FeedItemsEditor";
import { ReceiptDraft, ReceiptPicker } from "../../components/ReceiptPicker";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { notify } from "../../lib/notify";
import { API_ORIGIN } from "../../config";
import { useUnits } from "../../context/UnitsContext";

type Props = NativeStackScreenProps<PurchasesStackParamList, "EditPurchase">;

export function EditPurchaseScreen({ route, navigation }: Props) {
  const { purchaseId } = route.params;
  const queryClient = useQueryClient();
  const { massUnitLabel, fromDisplayMass, toDisplayMass } = useUnits();

  const purchasesQuery = useQuery({ queryKey: ["purchases"], queryFn: fetchPurchases });
  const contactsQuery = useQuery({ queryKey: ["contacts", "SUPPLIER"], queryFn: () => fetchContacts("SUPPLIER") });
  const manufacturersQuery = useQuery({ queryKey: ["feed-manufacturers"], queryFn: fetchFeedManufacturers });
  const pelletSizesQuery = useQuery({ queryKey: ["pellet-sizes"], queryFn: fetchPelletSizes });

  const purchase = purchasesQuery.data?.find((p) => p.id === purchaseId);
  const pelletSizes = pelletSizesQuery.data ?? [];

  const [seeded, setSeeded] = useState(false);
  const [category, setCategory] = useState<PurchaseCategory>("FEED");
  const [contactId, setContactId] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [feedManufacturerId, setFeedManufacturerId] = useState<string | undefined>(undefined);
  const [feedItems, setFeedItems] = useState<FeedItemLine[]>([]);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");

  const isFeed = category === "FEED";
  const isSeed = category === "FINGERLINGS_EGGS";

  useEffect(() => {
    if (seeded || !purchase) return;
    setCategory(purchase.category);
    setContactId(purchase.contactId ?? undefined);
    setQuantity(String(purchase.quantity));
    setUnitCost(String(purchase.unitCost));
    setFeedManufacturerId(purchase.feedManufacturerId ?? undefined);
    setFeedItems(
      purchase.items.map((i) => ({
        pelletSizeId: i.pelletSizeId,
        bagWeight: String(toDisplayMass(i.bagWeightKg)),
        numberOfBags: String(i.numberOfBags),
        ratePerBag: String(i.ratePerBag),
      }))
    );
    setPurchaseDate(purchase.purchaseDate.slice(0, 10));
    setNotes(purchase.notes ?? "");
    setSeeded(true);
  }, [seeded, purchase]);

  const feedTotal = feedItems.reduce((sum, l) => sum + (Number(l.numberOfBags) || 0) * (Number(l.ratePerBag) || 0), 0);
  const estimatedTotal = isFeed
    ? feedTotal
    : Number(quantity) > 0 && Number(unitCost) > 0
      ? Number(quantity) * Number(unitCost)
      : 0;
  const paidSoFar = purchase?.payments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const isFullyPaid = paidSoFar >= estimatedTotal - 0.01;

  const validFeedItems = feedItems.filter(
    (l) => l.pelletSizeId && Number(l.bagWeight) > 0 && Number(l.numberOfBags) > 0 && Number(l.ratePerBag) > 0
  );

  const mutation = useMutation({
    mutationFn: () =>
      updatePurchase(purchaseId, {
        contactId,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      navigation.goBack();
    },
  });

  // Receipt attach/remove happen immediately against the already-saved
  // purchase, independent of "Save changes" — no reason to make attaching a
  // receipt wait on unrelated field edits.
  const receiptUploadMutation = useMutation({
    mutationFn: (file: ReceiptDraft) => uploadPurchaseReceipt(purchaseId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
    onError: (err) => notify("Couldn't attach receipt", apiErrorMessage(err)),
  });

  const receiptRemoveMutation = useMutation({
    mutationFn: () => deletePurchaseReceipt(purchaseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchases"] }),
    onError: (err) => notify("Couldn't remove receipt", apiErrorMessage(err)),
  });

  const canSubmit = Boolean(
    purchaseDate &&
      (isFullyPaid || !!contactId) &&
      (isFeed
        ? feedManufacturerId && validFeedItems.length > 0 && validFeedItems.length === feedItems.length
        : Number(quantity) > 0 && Number(unitCost) > 0)
  );

  if (purchasesQuery.isPending) return <LoadingView />;
  if (purchasesQuery.isError) return <ErrorBanner message={apiErrorMessage(purchasesQuery.error)} onRetry={purchasesQuery.refetch} />;
  if (!purchase) return <EmptyState title="Purchase not found" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {PURCHASE_CATEGORIES.map((c) => (
          <PrimaryButton
            key={c}
            title={CATEGORY_LABEL[c]}
            variant={category === c ? "primary" : "secondary"}
            onPress={() => setCategory(c)}
            style={styles.chip}
          />
        ))}
      </View>

      {isFeed ? (
        <>
          <Text style={styles.label}>Feed manufacturer</Text>
          <View style={styles.chipRow}>
            {manufacturersQuery.data?.map((m) => (
              <PrimaryButton
                key={m.id}
                title={m.name}
                variant={feedManufacturerId === m.id ? "primary" : "secondary"}
                onPress={() => setFeedManufacturerId(m.id)}
                style={styles.chip}
              />
            ))}
          </View>

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
      <Text style={styles.meta}>Already paid ₹{paidSoFar.toFixed(2)} — payments are adjusted separately.</Text>

      <DateField label="Purchase date" value={purchaseDate} onChange={setPurchaseDate} />

      {!isFullyPaid && (
        <Text style={styles.dueNote}>The remaining balance will be owed to the supplier — a supplier is required.</Text>
      )}
      <Text style={styles.label}>Supplier{isFullyPaid ? " (optional)" : ""}</Text>
      <View style={styles.chipRow}>
        {isFullyPaid && (
          <PrimaryButton
            title="None"
            variant={contactId === undefined ? "primary" : "secondary"}
            onPress={() => setContactId(undefined)}
            style={styles.chip}
          />
        )}
        {contactsQuery.data?.map((c) => (
          <PrimaryButton
            key={c.id}
            title={c.name}
            variant={contactId === c.id ? "primary" : "secondary"}
            onPress={() => setContactId(c.id)}
            style={styles.chip}
          />
        ))}
      </View>

      <Text style={styles.label}>Receipt (optional)</Text>
      <ReceiptPicker
        draft={null}
        onPick={(file) => receiptUploadMutation.mutate(file)}
        existingUrl={purchase.receiptUrl ? `${API_ORIGIN}${purchase.receiptUrl}` : null}
        onRemove={purchase.receiptUrl ? () => receiptRemoveMutation.mutate() : undefined}
        removing={receiptRemoveMutation.isPending}
      />
      {receiptUploadMutation.isPending && <Text style={styles.meta}>Uploading receipt…</Text>}

      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Any observations" />

      <PrimaryButton title="Save changes" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, minWidth: 90 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  meta: { fontSize: 12, color: "#7a8787", marginBottom: 16 },
  dueNote: { fontSize: 12, color: "#b9770e", marginBottom: 12 },
});
