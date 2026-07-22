import React from "react";
import { StyleSheet, Text } from "react-native";
import { PaymentStatus } from "../api/types";

const LABEL: Record<PaymentStatus, string> = { PAID: "Paid", DUE: "Due", PARTIAL: "Partial" };
const COLOR: Record<PaymentStatus, string> = { PAID: "#0b6e6e", DUE: "#c0392b", PARTIAL: "#b9770e" };

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Text style={[styles.badge, { color: COLOR[status] }]}>{LABEL[status]}</Text>;
}

const styles = StyleSheet.create({
  badge: { fontSize: 12, fontWeight: "700" },
});
