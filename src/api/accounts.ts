import { apiClient } from "./client";
import { Account, AccountType, Ledger } from "./types";

export function fetchAccounts() {
  return apiClient.get<{ accounts: Account[] }>("/accounts").then((r) => r.data.accounts);
}

export function createAccount(input: { name: string; type: AccountType; openingBalance?: number }) {
  return apiClient.post<{ account: Account }>("/accounts", input).then((r) => r.data.account);
}

export function updateAccount(id: string, input: { name?: string; type?: AccountType }) {
  return apiClient.patch<{ account: Account }>(`/accounts/${id}`, input).then((r) => r.data.account);
}

export function closeAccount(id: string) {
  return apiClient.post<{ account: Account }>(`/accounts/${id}/close`).then((r) => r.data.account);
}

export function reopenAccount(id: string) {
  return apiClient.post<{ account: Account }>(`/accounts/${id}/reopen`).then((r) => r.data.account);
}

export function transferFunds(input: { fromAccountId: string; toAccountId: string; amount: number; note?: string }) {
  return apiClient.post("/accounts/transfer", input).then((r) => r.data);
}

export function depositFunds(input: { accountId: string; amount: number; note?: string }) {
  return apiClient.post("/accounts/deposit", input).then((r) => r.data);
}

export function fetchLedger() {
  return apiClient.get<Ledger>("/ledger").then((r) => r.data);
}
