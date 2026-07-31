import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalesStackParamList } from "../../navigation/types";
import { fetchSales, fetchProducts, updateSale } from "../../api/pos";
import { fetchContacts } from "../../api/contacts";
import { Product } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<SalesStackParamList, "EditSale">;

const UNIT_LABEL: Record<Product["unit"], string> = { KG: "kg", PIECE: "pc" };

export function EditSaleScreen({ route, navigation }: Props) {
  const { saleId } = route.params;
  const queryClient = useQueryClient();

  const salesQuery = useQuery({ queryKey: ["sales"], queryFn: fetchSales });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const customersQuery = useQuery({ queryKey: ["contacts", "CUSTOMER"], queryFn: () => fetchContacts("CUSTOMER") });

  const sale = salesQuery.data?.find((s) => s.id === saleId);

  const [seeded, setSeeded] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [pieceCounts, setPieceCounts] = useState<Record<string, string>>({});
  const [contactId, setContactId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (seeded || !sale) return;
    setCart(Object.fromEntries(sale.items.map((item) => [item.productId, item.quantity])));
    setPieceCounts(
      Object.fromEntries(sale.items.filter((item) => item.pieceCount).map((item) => [item.productId, String(item.pieceCount)]))
    );
    setContactId(sale.contactId ?? undefined);
    setSeeded(true);
  }, [seeded, sale]);

  const products = productsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  // A product already in this sale has "given back" its reserved quantity —
  // the real ceiling for the stepper is what's free elsewhere plus what this
  // sale currently holds.
  const originalQty = (productId: string) => sale?.items.find((i) => i.productId === productId)?.quantity ?? 0;
  const maxQty = (product: Product) => product.availableQty + originalQty(product.id);

  const setQty = (product: Product, qty: number) => {
    const clamped = Math.max(0, Math.min(qty, maxQty(product)));
    setCart((prev) => {
      const next = { ...prev };
      if (clamped <= 0) delete next[product.id];
      else next[product.id] = clamped;
      return next;
    });
    if (clamped <= 0) setPieceCounts((prev) => ({ ...prev, [product.id]: "" }));
  };

  const setPieceCountText = (product: Product, text: string) => {
    setPieceCounts((prev) => ({ ...prev, [product.id]: text }));
  };

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = products.find((p) => p.id === productId);
          if (!product) return null;
          const pieceCountNum = Math.round(Number(pieceCounts[productId]));
          const pieceCount = product.unit === "KG" && pieceCountNum > 0 ? pieceCountNum : undefined;
          return { product, quantity, pieceCount };
        })
        .filter((line): line is { product: Product; quantity: number; pieceCount: number | undefined } => line !== null),
    [cart, pieceCounts, products]
  );

  const total = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const paidSoFar = sale?.payments.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const isFullyPaid = paidSoFar >= total - 0.01;
  const due = Math.max(0, Math.round((total - paidSoFar) * 100) / 100);

  const mutation = useMutation({
    mutationFn: () =>
      updateSale(saleId, {
        contactId,
        items: cartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity, pieceCount: line.pieceCount })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-raceways"] });
      queryClient.invalidateQueries({ queryKey: ["raceway-operations"] });
      navigation.goBack();
    },
  });

  if (salesQuery.isPending || productsQuery.isPending) return <LoadingView />;
  if (salesQuery.isError) return <ErrorBanner message={apiErrorMessage(salesQuery.error)} onRetry={salesQuery.refetch} />;
  if (productsQuery.isError) return <ErrorBanner message={apiErrorMessage(productsQuery.error)} onRetry={productsQuery.refetch} />;
  if (!sale) return <EmptyState title="Sale not found" />;

  const canSubmit = cartLines.length > 0 && (isFullyPaid || !!contactId);

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const qty = cart[item.id] ?? 0;
          return (
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>₹{item.price.toFixed(2)}/{UNIT_LABEL[item.unit]}</Text>
              </View>
              <Text style={styles.meta}>{maxQty(item).toLocaleString()} {UNIT_LABEL[item.unit]} available</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperButton} onPress={() => setQty(item, qty - 1)} disabled={qty <= 0}>
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{qty}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setQty(item, qty + 1)}
                  disabled={qty >= maxQty(item)}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
                {item.unit === "KG" && qty > 0 && (
                  <View style={styles.pieceGroup}>
                    <Text style={styles.pieceLabel}>No. of pcs</Text>
                    <TextInput
                      style={styles.pieceInput}
                      value={pieceCounts[item.id] ?? ""}
                      onChangeText={(text) => setPieceCountText(item, text)}
                      keyboardType="number-pad"
                      placeholder="0"
                    />
                  </View>
                )}
              </View>
            </Card>
          );
        }}
      />

      <View style={styles.cartBar}>
        {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}
        <View style={[styles.rowBetween, styles.totalRow]}>
          <Text style={styles.totalLabel}>Already paid ₹{paidSoFar.toFixed(2)}</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
        </View>
        {!isFullyPaid && due > 0 && (
          <>
            <Text style={styles.dueNote}>₹{due.toFixed(2)} will be owed by the customer.</Text>
            {customers.length > 0 ? (
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
            ) : (
              <Text style={styles.dueNote}>Add a customer under Purchases → Contacts to enable a due balance.</Text>
            )}
          </>
        )}
        <PrimaryButton title="Save changes" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  listContent: { padding: 16, paddingBottom: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: "#1c2424", flexShrink: 1 },
  price: { fontSize: 14, fontWeight: "600", color: "#0b6e6e" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
  stepperRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 16, flexWrap: "wrap", rowGap: 10 },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0b6e6e",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonText: { fontSize: 18, fontWeight: "700", color: "#0b6e6e" },
  stepperValue: { fontSize: 15, fontWeight: "700", color: "#1c2424", minWidth: 24, textAlign: "center" },
  pieceGroup: { alignItems: "flex-start", marginLeft: 20, flexShrink: 0 },
  pieceLabel: { fontSize: 11, fontWeight: "700", color: "#7a8787", marginBottom: 4 },
  pieceInput: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1c2424",
    minWidth: 72,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#e2e8e8",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cartBar: {
    backgroundColor: "white",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8e8",
  },
  totalRow: { marginBottom: 12 },
  totalLabel: { fontSize: 14, color: "#3f4a4a" },
  totalValue: { fontSize: 20, fontWeight: "700", color: "#1c2424" },
  dueNote: { fontSize: 12, color: "#b9770e", marginBottom: 8 },
  customerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  customerChip: { borderWidth: 1, borderColor: "#0b6e6e", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  customerChipActive: { backgroundColor: "#0b6e6e" },
  customerChipText: { fontSize: 13, fontWeight: "700", color: "#0b6e6e" },
  customerChipTextActive: { color: "white" },
});
