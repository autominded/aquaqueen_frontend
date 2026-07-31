import { apiClient } from "./client";
import { Purchase, PurchaseCategory } from "./types";

export function fetchPurchases() {
  return apiClient.get<{ purchases: Purchase[] }>("/purchases").then((r) => r.data.purchases);
}

export interface FeedItemInput {
  pelletSizeId: string;
  bagWeightKg: number;
  numberOfBags: number;
  ratePerBag: number;
}

export function createPurchase(input: {
  contactId?: string;
  payments: { accountId: string; amount: number }[];
  category: PurchaseCategory;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  feedManufacturerId?: string;
  items?: FeedItemInput[];
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
    quantity: number;
    unit: string;
    unitCost: number;
    feedManufacturerId: string;
    items: FeedItemInput[];
    purchaseDate: string;
    notes: string;
  }>
) {
  return apiClient.patch<{ purchase: Purchase }>(`/purchases/${purchaseId}`, input).then((r) => r.data.purchase);
}

export function deletePurchase(purchaseId: string) {
  return apiClient.delete(`/purchases/${purchaseId}`);
}

export function uploadPurchaseReceipt(purchaseId: string, file: { uri: string; name: string; type: string; file?: File }) {
  const form = new FormData();
  // Web needs the real File/Blob to attach a file at all — { uri, name, type }
  // only works via React Native's own multipart handling on native platforms.
  if (file.file) {
    form.append("receipt", file.file, file.name);
  } else {
    // React Native's FormData accepts a { uri, name, type } file descriptor here,
    // which the DOM-oriented FormData typings don't model.
    form.append("receipt", file as unknown as Blob);
  }
  return apiClient
    .post<{ purchase: Purchase }>(`/purchases/${purchaseId}/receipt`, form, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data.purchase);
}

export function deletePurchaseReceipt(purchaseId: string) {
  return apiClient.delete<{ purchase: Purchase }>(`/purchases/${purchaseId}/receipt`).then((r) => r.data.purchase);
}
