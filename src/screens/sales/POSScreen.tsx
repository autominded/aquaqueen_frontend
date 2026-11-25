import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalesStackParamList } from "../../navigation/types";
import { createProduct, createSale, fetchProducts } from "../../api/pos";
import { fetchBatch, fetchRacewayOperations, fetchSamplingEntries } from "../../api/batches";
import { fetchAccounts } from "../../api/accounts";
import { createContact, fetchContacts } from "../../api/contacts";
import { fetchFarm } from "../../api/farm";
import { Product, ProductUnit } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { PaymentLine, PaymentSplitEditor } from "../../components/PaymentSplitEditor";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { printReceipt } from "../../lib/receipt";
import { confirmAction } from "../../lib/confirm";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<SalesStackParamList, "POS">;

const UNIT_LABEL: Record<Product["unit"], string> = { KG: "kg", PIECE: "pc" };
const PRODUCT_UNITS: ProductUnit[] = ["KG", "PIECE"];
const SALABLE_WEIGHT_G = 200;

export function POSScreen({ route, navigation }: Props) {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const customersQuery = useQuery({ queryKey: ["contacts", "CUSTOMER"], queryFn: () => fetchContacts("CUSTOMER") });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });

  // Quantities are kept as raw strings, not numbers — KG products need
  // decimal amounts (e.g. "2.5"), and parsing on every keystroke would
  // stomp a trailing "." while the user is still typing it.
  const [cart, setCart] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [contactId, setContactId] = useState<string | undefined>(undefined);

  // Quick-create a customer inline instead of leaving POS to add one under
  // Purchases → Contacts — same shape as NewContactScreen, just the two
  // fields that actually matter mid-checkout.
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("+91 ");
  const addCustomerMutation = useMutation({
    mutationFn: () =>
      createContact({
        type: "CUSTOMER",
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() && newCustomerPhone.trim() !== "+91" ? newCustomerPhone.trim() : undefined,
      }),
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "CUSTOMER"] });
      setContactId(contact.id);
      setAddingCustomer(false);
      setNewCustomerName("");
      setNewCustomerPhone("+91 ");
    },
  });

  // No. of pieces a KG line represents — auto-suggested from the product's
  // avgWeightG snapshot whenever the quantity changes, but a plain editable
  // field otherwise (a manual figure the shopper counted out, or a product
  // with no avgWeightG on record at all).
  const [pieceCounts, setPieceCounts] = useState<Record<string, string>>({});
  const suggestPieceCount = (product: Product, qty: number) =>
    product.unit === "KG" && product.avgWeightG && qty > 0 ? String(Math.round((qty * 1000) / product.avgWeightG)) : "";

  // "Plan harvest" (RacewayOperationsScreen/BatchDetailsScreen) drops the
  // user straight here instead of through a separate harvest-plan-then-
  // completed-then-list-for-sale chain — this card is that whole flow
  // collapsed into one inline step: pick the batch (skipped if there's only
  // one), price it, and it's immediately in the cart below.
  const [harvestActive, setHarvestActive] = useState(Boolean(route.params?.batchId || route.params?.racewayId));
  const [harvestBatchId, setHarvestBatchId] = useState(route.params?.batchId);
  const [harvestUnit, setHarvestUnit] = useState<ProductUnit>("KG");
  const [harvestPrice, setHarvestPrice] = useState("");
  const [harvestQty, setHarvestQty] = useState("");

  useEffect(() => {
    if (route.params?.batchId || route.params?.racewayId) {
      setHarvestBatchId(route.params.batchId);
      setHarvestActive(true);
    }
  }, [route.params?.batchId, route.params?.racewayId]);

  const racewayId = !harvestBatchId ? route.params?.racewayId : undefined;
  const racewayOpsQuery = useQuery({
    queryKey: ["raceway-operations", racewayId],
    queryFn: () => fetchRacewayOperations(racewayId!),
    enabled: harvestActive && !!racewayId,
  });
  const harvestBatchQuery = useQuery({
    queryKey: ["batch", harvestBatchId],
    queryFn: () => fetchBatch(harvestBatchId!),
    enabled: harvestActive && !!harvestBatchId,
  });
  // Snapshotted onto the Product at listing time, so POS can later suggest a
  // piece count for a KG sale without re-deriving it from sampling history.
  const harvestSamplingQuery = useQuery({
    queryKey: ["sampling", harvestBatchId],
    queryFn: () => fetchSamplingEntries(harvestBatchId!),
    enabled: harvestActive && !!harvestBatchId,
  });
  const harvestAvgWeightG = harvestSamplingQuery.data?.[0]?.avgWeightG;

  // A raceway with exactly one batch stocked doesn't need a picker step.
  useEffect(() => {
    if (!harvestBatchId && racewayOpsQuery.data?.stockings.length === 1) {
      setHarvestBatchId(racewayOpsQuery.data.stockings[0].batch.id);
    }
  }, [harvestBatchId, racewayOpsQuery.data]);

  const resetHarvestCard = () => {
    setHarvestActive(false);
    setHarvestBatchId(undefined);
    setHarvestUnit("KG");
    setHarvestPrice("");
    setHarvestQty("");
    navigation.setParams({ batchId: undefined, racewayId: undefined });
  };

  const listMutation = useMutation({
    mutationFn: () =>
      createProduct({
        batchId: harvestBatchId,
        name: `${harvestBatchQuery.data!.species} — ${harvestBatchQuery.data!.code}`,
        unit: harvestUnit,
        price: Number(harvestPrice),
        availableQty: Number(harvestQty),
        avgWeightG: harvestAvgWeightG,
      }),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setCart((prev) => ({ ...prev, [product.id]: String(product.availableQty) }));
      setPieceCounts((prev) => ({ ...prev, [product.id]: suggestPieceCount(product, product.availableQty) }));
      resetHarvestCard();
    },
  });

  const products = productsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  // Tapping "Add" is the only way a product enters the cart — no quantity
  // has to be decided up front. A minimal default (1, clamped to whatever's
  // actually in stock) lands it in the cart with the stepper immediately
  // available below to fine-tune from there.
  const addToCart = (product: Product) => {
    const qty = Math.min(1, product.availableQty);
    setCart((prev) => ({ ...prev, [product.id]: String(qty) }));
    setPieceCounts((prev) => ({ ...prev, [product.id]: suggestPieceCount(product, qty) }));
  };

  // For the +/- buttons, which step by a whole unit off the current value.
  const adjustQty = (product: Product, delta: number) => {
    const current = Number(cart[product.id]) || 0;
    const clamped = Math.max(0, Math.min(current + delta, product.availableQty));
    setCart((prev) => {
      const next = { ...prev };
      if (clamped <= 0) delete next[product.id];
      else next[product.id] = String(clamped);
      return next;
    });
    setPieceCounts((prev) => ({ ...prev, [product.id]: suggestPieceCount(product, clamped) }));
  };

  // For typing a quantity directly (decimals included) — the raw text is
  // kept as-is while it's still being typed (so "2." isn't mangled before
  // the "5" lands), only snapping down once a complete value overshoots
  // what's actually available.
  const setQtyText = (product: Product, text: string) => {
    let resolvedQty = 0;
    setCart((prev) => {
      const next = { ...prev };
      const num = Number(text);
      if (text.trim() === "" || (Number.isFinite(num) && num <= 0)) {
        delete next[product.id];
      } else if (Number.isFinite(num) && num > product.availableQty) {
        next[product.id] = String(product.availableQty);
        resolvedQty = product.availableQty;
      } else {
        next[product.id] = text;
        resolvedQty = num;
      }
      return next;
    });
    setPieceCounts((prev) => ({ ...prev, [product.id]: suggestPieceCount(product, resolvedQty) }));
  };

  const setPieceCountText = (product: Product, text: string) => {
    setPieceCounts((prev) => ({ ...prev, [product.id]: text }));
  };

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantityText]) => {
          const product = products.find((p) => p.id === productId);
          const quantity = Number(quantityText);
          if (!product || !(quantity > 0 && quantity <= product.availableQty)) return null;
          const pieceCountNum = Math.round(Number(pieceCounts[productId]));
          const pieceCount = product.unit === "KG" && pieceCountNum > 0 ? pieceCountNum : undefined;
          return { product, quantity, pieceCount };
        })
        .filter((line): line is { product: Product; quantity: number; pieceCount: number | undefined } => line !== null),
    [cart, pieceCounts, products]
  );

  const total = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  // Keep a single default payment row tracking the live cart total; once the
  // shopper splits into more than one row, their manual amounts take over.
  useEffect(() => {
    if (payments.length <= 1 && accounts[0]) {
      setPayments([{ accountId: payments[0]?.accountId ?? accounts[0].id, amount: total > 0 ? String(total) : "" }]);
    }
  }, [total, accounts.length]);

  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const paymentsWithinTotal = paymentsTotal <= total + 0.01;
  const isFullyPaid = paymentsWithinTotal && Math.abs(paymentsTotal - total) < 0.01;
  const remaining = Math.max(0, Math.round((total - paymentsTotal) * 100) / 100);

  const checkoutMutation = useMutation({
    mutationFn: () =>
      createSale({
        contactId,
        payments: payments
          .filter((p) => Number(p.amount) > 0)
          .map((p) => ({ accountId: p.accountId, amount: Number(p.amount) })),
        items: cartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity, pieceCount: line.pieceCount })),
      }),
    onSuccess: (sale) => {
      setCart({});
      setPieceCounts({});
      setPayments([]);
      setContactId(undefined);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      // A piece-count line just decremented a batch's currentCount server-side
      // — refresh every screen that shows fish counts, not just the cart.
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      queryClient.invalidateQueries({ queryKey: ["raceway-operations"] });
      confirmAction(
        { title: "Sale complete", message: `₹${sale.totalAmount.toFixed(2)} — print a receipt?`, confirmLabel: "Print receipt" },
        () => printReceipt(sale, farmQuery.data ?? null, user?.organizationName ?? "FarmFin")
      );
    },
  });

  const canListHarvest = Boolean(harvestBatchId && Number(harvestPrice) > 0 && Number(harvestQty) > 0);

  if (productsQuery.isPending || accountsQuery.isPending) return <LoadingView />;
  if (productsQuery.isError) return <ErrorBanner message={apiErrorMessage(productsQuery.error)} onRetry={productsQuery.refetch} />;
  if (accountsQuery.isError) return <ErrorBanner message={apiErrorMessage(accountsQuery.error)} onRetry={accountsQuery.refetch} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>POINT OF SALE</Text><Text style={styles.heading}>Sell today</Text></View>
        <View style={styles.headerActions}>
          {hasPermission("products.manage") && <TouchableOpacity style={styles.addProductAction} onPress={() => navigation.navigate("NewProduct")}><Text style={styles.addProductText}>Add product</Text></TouchableOpacity>}
          <TouchableOpacity style={styles.historyAction} onPress={() => navigation.navigate("SalesHistory")}><Text style={styles.historyText}>History</Text></TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={products.length === 0 ? styles.emptyContainer : styles.listContent}
        ListHeaderComponent={
          harvestActive ? (
            <Card style={styles.harvestCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.harvestTitle}>Plan harvest</Text>
                <TouchableOpacity onPress={resetHarvestCard}><Text style={styles.harvestCancel}>Cancel</Text></TouchableOpacity>
              </View>
              {listMutation.isError && <ErrorBanner message={apiErrorMessage(listMutation.error)} />}

              {racewayOpsQuery.isPending && !harvestBatchId && <LoadingView />}
              {racewayOpsQuery.isError && !harvestBatchId && (
                <ErrorBanner message={apiErrorMessage(racewayOpsQuery.error)} onRetry={racewayOpsQuery.refetch} />
              )}
              {!harvestBatchId && racewayOpsQuery.data && racewayOpsQuery.data.stockings.length > 1 && (
                <>
                  <Text style={styles.harvestLabel}>Which batch?</Text>
                  <View style={styles.harvestChipRow}>
                    {racewayOpsQuery.data.stockings.map((s) => (
                      <PrimaryButton
                        key={s.batch.id}
                        title={`${s.batch.code} — ${s.batch.species}`}
                        variant="secondary"
                        onPress={() => setHarvestBatchId(s.batch.id)}
                        style={styles.harvestChip}
                      />
                    ))}
                  </View>
                </>
              )}

              {harvestBatchId && harvestBatchQuery.isPending && <LoadingView />}
              {harvestBatchId && harvestBatchQuery.isError && (
                <ErrorBanner message={apiErrorMessage(harvestBatchQuery.error)} onRetry={harvestBatchQuery.refetch} />
              )}
              {harvestBatchId && harvestBatchQuery.data && (
                <>
                  <Text style={styles.harvestBatchName}>
                    {harvestBatchQuery.data.species} — {harvestBatchQuery.data.code}
                  </Text>
                  {harvestAvgWeightG != null && harvestAvgWeightG < SALABLE_WEIGHT_G && (
                    <Text style={styles.notSalableWarning}>
                      Avg. weight is {Math.round(harvestAvgWeightG)}g — under {SALABLE_WEIGHT_G}g, not yet a salable size.
                    </Text>
                  )}
                  <Text style={styles.harvestLabel}>Unit</Text>
                  <View style={styles.harvestChipRow}>
                    {PRODUCT_UNITS.map((u) => (
                      <PrimaryButton
                        key={u}
                        title={u === "KG" ? "Kilograms" : "Pieces"}
                        variant={harvestUnit === u ? "primary" : "secondary"}
                        onPress={() => setHarvestUnit(u)}
                        style={styles.harvestUnitChip}
                      />
                    ))}
                  </View>
                  <View style={styles.row}>
                    <FormField
                      label={`Price per ${UNIT_LABEL[harvestUnit]}`}
                      value={harvestPrice}
                      onChangeText={setHarvestPrice}
                      keyboardType="numeric"
                      placeholder="6.50"
                      style={styles.rowField}
                    />
                    <FormField
                      label={`Quantity (${UNIT_LABEL[harvestUnit]})`}
                      value={harvestQty}
                      onChangeText={setHarvestQty}
                      keyboardType="numeric"
                      placeholder="120"
                      style={styles.rowField}
                    />
                  </View>
                  <PrimaryButton
                    title="Add to cart"
                    onPress={() => listMutation.mutate()}
                    loading={listMutation.isPending}
                    disabled={!canListHarvest}
                  />
                </>
              )}
            </Card>
          ) : null
        }
        ListEmptyComponent={
          harvestActive ? null : <EmptyState title="No products listed" subtitle="List a completed harvest for sale to get started." />
        }
        renderItem={({ item }) => {
          const qtyText = cart[item.id] ?? "";
          const qty = Number(qtyText) || 0;
          return (
            <Card style={styles.productCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>₹{item.price.toFixed(2)}/{UNIT_LABEL[item.unit]}</Text>
              </View>
              <Text style={styles.meta}>{item.availableQty.toLocaleString()} {UNIT_LABEL[item.unit]} available</Text>
              {qty <= 0 ? (
                <PrimaryButton
                  title="+ Add"
                  onPress={() => addToCart(item)}
                  disabled={item.availableQty <= 0}
                  style={styles.addButton}
                />
              ) : (
                <View style={styles.stepperRow}>
                  <View style={styles.qtyGroup}>
                    <TouchableOpacity style={styles.stepperButton} onPress={() => adjustQty(item, -1)}>
                      <Text style={styles.stepperButtonText}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.stepperInput}
                      value={qtyText}
                      onChangeText={(text) => setQtyText(item, text)}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => adjustQty(item, 1)}
                      disabled={qty >= item.availableQty}
                    >
                      <Text style={styles.stepperButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {item.unit === "KG" && (
                    <View style={styles.pieceGroup}>
                      <Text style={styles.pieceLabel}>No. of pcs</Text>
                      <TextInput
                        style={styles.pieceInput}
                        value={pieceCounts[item.id] ?? ""}
                        onChangeText={(text) => setPieceCountText(item, text)}
                        keyboardType="number-pad"
                        placeholder={item.avgWeightG ? "auto" : "0"}
                      />
                    </View>
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />

      <View style={styles.cartBar}>
        {checkoutMutation.isError && <ErrorBanner message={apiErrorMessage(checkoutMutation.error)} />}
        <View style={[styles.rowBetween, styles.totalRow]}>
          <Text style={styles.totalLabel}>{itemCount} item{itemCount === 1 ? "" : "s"}</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
        </View>
        {cartLines.length > 0 && (
          <PaymentSplitEditor accounts={accounts} total={total} payments={payments} onChange={setPayments} />
        )}
        {cartLines.length > 0 && (
          <>
            {!isFullyPaid && remaining > 0 ? (
              <Text style={styles.dueNote}>₹{remaining.toFixed(2)} will be recorded as owed by the customer.</Text>
            ) : (
              <Text style={styles.customerLabel}>Customer (optional)</Text>
            )}
            {customers.length > 0 && (
              <View style={styles.customerRow}>
                {customers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setContactId(contactId === c.id ? undefined : c.id)}
                    style={[styles.customerChip, contactId === c.id && styles.customerChipActive]}
                  >
                    <Text style={[styles.customerChipText, contactId === c.id && styles.customerChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {addingCustomer ? (
              <View style={styles.newCustomerCard}>
                {addCustomerMutation.isError && <ErrorBanner message={apiErrorMessage(addCustomerMutation.error)} />}
                <FormField label="Customer name" value={newCustomerName} onChangeText={setNewCustomerName} placeholder="Alex Rivers" />
                <FormField label="Phone (optional)" value={newCustomerPhone} onChangeText={setNewCustomerPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
                <View style={styles.newCustomerActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={() => setAddingCustomer(false)} style={styles.newCustomerButton} />
                  <PrimaryButton
                    title="Add customer"
                    onPress={() => addCustomerMutation.mutate()}
                    loading={addCustomerMutation.isPending}
                    disabled={!newCustomerName.trim()}
                    style={styles.newCustomerButton}
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setAddingCustomer(true)}>
                <Text style={styles.addCustomerLink}>+ Add a new customer</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <PrimaryButton
          title="Checkout"
          onPress={() => checkoutMutation.mutate()}
          loading={checkoutMutation.isPending}
          disabled={cartLines.length === 0 || !paymentsWithinTotal || (!isFullyPaid && !contactId)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }, eyebrow: { fontSize: 11, color: colors.teal, fontWeight: "800", letterSpacing: 1 }, heading: { fontSize: 26, color: colors.ocean, fontWeight: "800", marginTop: 3 }, headerActions: { flexDirection: "row", gap: 8, alignItems: "center" }, addProductAction: { minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderRadius: radii.sm, backgroundColor: colors.teal }, historyAction: { minHeight: 40, paddingHorizontal: 8, justifyContent: "center" }, addProductText: { color: colors.white, fontSize: 13, fontWeight: "800" }, historyText: { color: colors.teal, fontSize: 13, fontWeight: "800" },
  listContent: { paddingBottom: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  harvestCard: { marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: colors.teal },
  harvestTitle: { fontSize: 16, fontWeight: "800", color: colors.ocean },
  harvestCancel: { fontSize: 13, fontWeight: "700", color: colors.inkMuted },
  harvestLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, marginTop: 12, marginBottom: 8 },
  harvestBatchName: { fontSize: 15, fontWeight: "800", color: colors.ink, marginTop: 4 },
  notSalableWarning: { fontSize: 12, fontWeight: "700", color: colors.amber, backgroundColor: colors.amberSoft, borderRadius: radii.sm, padding: 8, marginTop: 8 },
  harvestChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  harvestChip: { minWidth: 120 },
  harvestUnitChip: { flex: 1 },
  productCard: { marginHorizontal: 16 }, name: { fontSize: 15, fontWeight: "800", color: colors.ink, flexShrink: 1 },
  price: { fontSize: 14, fontWeight: "800", color: colors.teal },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  addButton: { marginTop: 10 },
  stepperRow: { flexDirection: "row", alignItems: "center", marginTop: 10, flexWrap: "wrap", rowGap: 10 },
  qtyGroup: { flexDirection: "row", alignItems: "center", gap: 16 },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { fontSize: 18, fontWeight: "700", color: colors.teal },
  stepperInput: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    minWidth: 56,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  pieceGroup: { alignItems: "flex-start", marginLeft: 20, flexShrink: 0 },
  pieceLabel: { fontSize: 11, fontWeight: "700", color: colors.inkMuted, marginBottom: 4 },
  pieceInput: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    minWidth: 72,
    textAlign: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cartBar: {
    backgroundColor: colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: { marginBottom: 12 },
  totalLabel: { fontSize: 14, color: colors.inkMuted }, totalValue: { fontSize: 22, fontWeight: "800", color: colors.ink }, dueNote: { fontSize: 12, color: colors.amber, marginBottom: 8 }, customerLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 8 }, customerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }, customerChip: { borderWidth: 1, borderColor: colors.teal, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 8 }, customerChipActive: { backgroundColor: colors.teal }, customerChipText: { fontSize: 13, fontWeight: "700", color: colors.teal }, customerChipTextActive: { color: colors.white },
  addCustomerLink: { fontSize: 13, fontWeight: "700", color: colors.teal, marginBottom: 12 },
  newCustomerCard: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 12 },
  newCustomerActions: { flexDirection: "row", gap: 8 },
  newCustomerButton: { flex: 1 },
});
