import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Account } from "../api/types";

export interface PaymentLine {
  accountId: string;
  amount: string;
}

interface Props {
  accounts: Account[];
  total: number;
  payments: PaymentLine[];
  onChange: (payments: PaymentLine[]) => void;
}

// Lets a Sale/Purchase be paid across more than one account (e.g. half cash,
// half bank) — mirrors UltimatePOS's split-payment model, where each portion
// posts its own ledger entry against the account it was paid from.
export function PaymentSplitEditor({ accounts, total, payments, onChange }: Props) {
  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = Math.round((total - paymentsTotal) * 100) / 100;

  const setAccount = (index: number, accountId: string) => {
    const next = payments.map((p, i) => (i === index ? { ...p, accountId } : p));
    onChange(next);
  };

  const setAmount = (index: number, amount: string) => {
    const next = payments.map((p, i) => (i === index ? { ...p, amount } : p));
    onChange(next);
  };

  const addRow = () => {
    const usedIds = new Set(payments.map((p) => p.accountId));
    const nextAccount = accounts.find((a) => !usedIds.has(a.id));
    if (!nextAccount) return;
    onChange([...payments, { accountId: nextAccount.id, amount: remaining > 0 ? String(remaining) : "" }]);
  };

  const removeRow = (index: number) => {
    onChange(payments.filter((_, i) => i !== index));
  };

  return (
    <View>
      {payments.map((payment, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.accountChips}>
            {accounts.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setAccount(index, a.id)}
                style={[styles.chip, payment.accountId === a.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, payment.accountId === a.id && styles.chipTextActive]}>{a.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.amountInput}
            value={payment.amount}
            onChangeText={(v) => setAmount(index, v)}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#9aa5a5"
          />
          {payments.length > 1 && (
            <TouchableOpacity onPress={() => removeRow(index)}>
              <Text style={styles.removeLink}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {accounts.length > payments.length && (
        <TouchableOpacity onPress={addRow}>
          <Text style={styles.addLink}>+ Split across another account</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.remaining, remaining < 0 && styles.remainingMismatch]}>
        {remaining === 0
          ? "Payments match the total"
          : remaining < 0
            ? `Overpaid by ₹${Math.abs(remaining).toFixed(2)}`
            : `Remaining: ₹${remaining.toFixed(2)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  accountChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  chip: {
    borderWidth: 1,
    borderColor: "#0b6e6e",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: "#0b6e6e" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#0b6e6e" },
  chipTextActive: { color: "white" },
  amountInput: {
    borderWidth: 1,
    borderColor: "#d7dede",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: "#1c2424",
    backgroundColor: "white",
    width: 90,
  },
  removeLink: { fontSize: 12, fontWeight: "700", color: "#c0392b" },
  addLink: { fontSize: 13, fontWeight: "700", color: "#0b6e6e", marginBottom: 8 },
  remaining: { fontSize: 13, fontWeight: "700", color: "#0b6e6e", marginBottom: 16 },
  remainingMismatch: { color: "#c0392b" },
});
