import { apiClient } from "./client";
import { Product, ProductUnit, Sale } from "./types";

export function fetchProducts() {
  return apiClient.get<{ products: Product[] }>("/products").then((r) => r.data.products);
}

export function createProduct(input: {
  batchId?: string;
  name: string;
  unit: ProductUnit;
  price: number;
  availableQty: number;
  avgWeightG?: number;
}) {
  return apiClient.post<{ product: Product }>("/products", input).then((r) => r.data.product);
}

export function createSale(input: {
  contactId?: string;
  payments: { accountId: string; amount: number }[];
  items: { productId: string; quantity: number; pieceCount?: number }[];
}) {
  return apiClient.post<{ sale: Sale }>("/sales", input).then((r) => r.data.sale);
}

export function fetchSales() {
  return apiClient.get<{ sales: Sale[] }>("/sales").then((r) => r.data.sales);
}

export function recordSalePayment(saleId: string, input: { accountId: string; amount: number }) {
  return apiClient.post<{ sale: Sale }>(`/sales/${saleId}/payments`, input).then((r) => r.data.sale);
}

export function updateSale(saleId: string, input: { contactId?: string; items: { productId: string; quantity: number }[] }) {
  return apiClient.patch<{ sale: Sale }>(`/sales/${saleId}`, input).then((r) => r.data.sale);
}

export function deleteSale(saleId: string) {
  return apiClient.delete(`/sales/${saleId}`);
}
