import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SalesStackParamList } from "../../navigation/types";
import { createSale, fetchProducts } from "../../api/pos";
import { fetchAccounts } from "../../api/accounts";
import { fetchContacts } from "../../api/contacts";
import { fetchFarm } from "../../api/farm";
import { Product } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { PaymentLine, PaymentSplitEditor } from "../../components/PaymentSplitEditor";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { printReceipt } from "../../lib/receipt";

type Props = NativeStackScreenProps<SalesStackParamList, "POS">;

const UNIT_LABEL: Record<Product["unit"], string> = { KG: "kg", PIECE: "pc" };

export function POSScreen({ navigation }: Props) {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const customersQuery = useQuery({ queryKey: ["contacts", "CUSTOMER"], queryFn: () => fetchContacts("CUSTOMER") });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });

  const [cart, setCart] = useState<Record<string, number>>({});
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [contactId, setContactId] = useState<string | undefined>(undefined);

  const products = productsQuery.data ?? [];
  const accounts = accountsQuery.data ?? [];
  const customers = customersQuery.data ?? [];

  const setQty = (product: Product, qty: number) => {
    const clamped = Math.max(0, Math.min(qty, product.availableQty));
    setCart((prev) => {
      const next = { ...prev };
      if (clamped <= 0) delete next[product.id];
      else next[product.id] = clamped;
      return next;
    });
  };

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = products.find((p) => p.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter((line): line is { product: Product; quantity: number } => line !== null),
    [cart, products]
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
        items: cartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      }),
    onSuccess: (sale) => {
      setCart({});
      setPayments([]);
      setContactId(undefined);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      Alert.alert("Sale complete", `$${sale.totalAmount.toFixed(2)}`, [
        {
          text: "Print receipt",
          onPress: () => printReceipt(sale, farmQuery.data ?? null, user?.organizationName ?? "AquaQueen"),
        },
        { text: "OK", style: "cancel" },
      ]);
    },
  });

  if (productsQuery.isPending || accountsQuery.isPending) return <LoadingView />;
  if (productsQuery.isError) return <ErrorBanner message={apiErrorMessage(productsQuery.error)} onRetry={productsQuery.refetch} />;
  if (accountsQuery.isError) return <ErrorBanner message={apiErrorMessage(accountsQuery.error)} onRetry={accountsQuery.refetch} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {hasPermission("products.manage") && (
          <PrimaryButton title="+ New product" onPress={() => navigation.navigate("NewProduct")} style={styles.headerButton} />
        )}
        <PrimaryButton title="History" variant="secondary" onPress={() => navigation.navigate("SalesHistory")} style={styles.headerButton} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={products.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <EmptyState title="No products listed" subtitle="List a completed harvest for sale to get started." />
        }
        renderItem={({ item }) => {
          const qty = cart[item.id] ?? 0;
          return (
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>${item.price.toFixed(2)}/{UNIT_LABEL[item.unit]}</Text>
              </View>
              <Text style={styles.meta}>{item.availableQty.toLocaleString()} {UNIT_LABEL[item.unit]} available</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepperButton} onPress={() => setQty(item, qty - 1)} disabled={qty <= 0}>
                  <Text style={styles.stepperButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{qty}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setQty(item, qty + 1)}
                  disabled={qty >= item.availableQty}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
      />

      <View style={styles.cartBar}>
        {checkoutMutation.isError && <ErrorBanner message={apiErrorMessage(checkoutMutation.error)} />}
        <View style={[styles.rowBetween, styles.totalRow]}>
          <Text style={styles.totalLabel}>{itemCount} item{itemCount === 1 ? "" : "s"}</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
        {cartLines.length > 0 && (
          <PaymentSplitEditor accounts={accounts} total={total} payments={payments} onChange={setPayments} />
        )}
        {!isFullyPaid && remaining > 0 && (
          <>
            <Text style={styles.dueNote}>${remaining.toFixed(2)} will be recorded as owed by the customer.</Text>
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
              <Text style={styles.dueNote}>Add a customer under Purchases → Contacts to enable a due sale.</Text>
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
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  header: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 4 },
  headerButton: { flex: 1 },
  listContent: { paddingBottom: 12 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: "#1c2424", flexShrink: 1 },
  price: { fontSize: 14, fontWeight: "600", color: "#0b6e6e" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
  stepperRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 16 },
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
