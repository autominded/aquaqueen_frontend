import { apiClient } from "./client";
import { Purchase, PurchaseCategory } from "./types";

export function fetchPurchases() {
  return apiClient.get<{ purchases: Purchase[] }>("/purchases").then((r) => r.data.purchases);
}

export function createPurchase(input: {
  contactId?: string;
  payments: { accountId: string; amount: number }[];
  category: PurchaseCategory;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  purchaseDate: string;
  notes?: string;
}) {
  return apiClient.post<{ purchase: Purchase }>("/purchases", input).then((r) => r.data.purchase);
}

export function recordPurchasePayment(purchaseId: string, input: { accountId: string; amount: number }) {
  return apiClient.post<{ purchase: Purchase }>(`/purchases/${purchaseId}/payments`, input).then((r) => r.data.purchase);
}

export function updatePurchase(
  purchaseId: string,
  input: Partial<{
    contactId: string;
    category: PurchaseCategory;
    description: string;
    quantity: number;
    unit: string;
    unitCost: number;
    purchaseDate: string;
    notes: string;
  }>
) {
  return apiClient.patch<{ purchase: Purchase }>(`/purchases/${purchaseId}`, input).then((r) => r.data.purchase);
}

export function deletePurchase(purchaseId: string) {
  return apiClient.delete(`/purchases/${purchaseId}`);
}
