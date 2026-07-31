import React from "react";
import { PaymentStatus } from "../api/types";
import { StatusPill } from "./StatusPill";

const LABEL: Record<PaymentStatus, string> = { PAID: "Paid", DUE: "Due", PARTIAL: "Partial" };
const TONE: Record<PaymentStatus, "success" | "critical" | "warning"> = { PAID: "success", DUE: "critical", PARTIAL: "warning" };

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <StatusPill label={LABEL[status]} tone={TONE[status]} />;
}
