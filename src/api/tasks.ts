import { apiClient } from "./client";
import {
  CleaningTask,
  DailyTask,
  FeedStockThreshold,
  RecurrenceType,
  RepairPriority,
  RepairTask,
  StockTransfer,
  WaterChangeTask,
} from "./types";

// ── Daily tasks ─────────────────────────────────────────────────────────
export function fetchDailyTasks() {
  return apiClient.get<{ tasks: DailyTask[] }>("/daily-tasks").then((r) => r.data.tasks);
}
export function createDailyTask(input: { title: string; notes?: string; dueDate: string; recurrence?: RecurrenceType; assignedToId?: string }) {
  return apiClient.post<{ task: DailyTask }>("/daily-tasks", input).then((r) => r.data.task);
}
export function completeDailyTask(id: string) {
  return apiClient.post<{ task: DailyTask }>(`/daily-tasks/${id}/complete`).then((r) => r.data.task);
}
export function deleteDailyTask(id: string) {
  return apiClient.delete(`/daily-tasks/${id}`);
}

// ── Cleaning tasks ──────────────────────────────────────────────────────
export function fetchCleaningTasks() {
  return apiClient.get<{ tasks: CleaningTask[] }>("/cleaning-tasks").then((r) => r.data.tasks);
}
export function createCleaningTask(input: {
  title: string;
  racewayId?: string;
  dueDate: string;
  recurrence?: RecurrenceType;
  assignedToId?: string;
  notes?: string;
  checklistItems?: string[];
}) {
  return apiClient.post<{ task: CleaningTask }>("/cleaning-tasks", input).then((r) => r.data.task);
}
export function toggleCleaningChecklistItem(taskId: string, itemId: string, done: boolean) {
  return apiClient.patch<{ task: CleaningTask }>(`/cleaning-tasks/${taskId}/checklist/${itemId}`, { done }).then((r) => r.data.task);
}
export function completeCleaningTask(id: string) {
  return apiClient.post<{ task: CleaningTask }>(`/cleaning-tasks/${id}/complete`).then((r) => r.data.task);
}
export function deleteCleaningTask(id: string) {
  return apiClient.delete(`/cleaning-tasks/${id}`);
}

// ── Water-change tasks ──────────────────────────────────────────────────
export function fetchWaterChangeTasks() {
  return apiClient.get<{ tasks: WaterChangeTask[] }>("/water-change-tasks").then((r) => r.data.tasks);
}
export function createWaterChangeTask(input: {
  racewayId?: string;
  dueDate: string;
  recurrence?: RecurrenceType;
  percentPlanned?: number;
  assignedToId?: string;
  notes?: string;
}) {
  return apiClient.post<{ task: WaterChangeTask }>("/water-change-tasks", input).then((r) => r.data.task);
}
export function completeWaterChangeTask(id: string) {
  return apiClient.post<{ task: WaterChangeTask }>(`/water-change-tasks/${id}/complete`).then((r) => r.data.task);
}
export function deleteWaterChangeTask(id: string) {
  return apiClient.delete(`/water-change-tasks/${id}`);
}

// ── Repair tasks ────────────────────────────────────────────────────────
export function fetchRepairTasks() {
  return apiClient.get<{ tasks: RepairTask[] }>("/repair-tasks").then((r) => r.data.tasks);
}
export function createRepairTask(input: {
  title: string;
  description?: string;
  racewayId?: string;
  priority?: RepairPriority;
  dueDate?: string;
  assignedToId?: string;
}) {
  return apiClient.post<{ task: RepairTask }>("/repair-tasks", input).then((r) => r.data.task);
}
export function completeRepairTask(id: string) {
  return apiClient.post<{ task: RepairTask }>(`/repair-tasks/${id}/complete`).then((r) => r.data.task);
}
export function deleteRepairTask(id: string) {
  return apiClient.delete(`/repair-tasks/${id}`);
}

// ── Stock transfer (grading) ────────────────────────────────────────────
export function fetchStockTransfers() {
  return apiClient.get<{ transfers: StockTransfer[] }>("/stock-transfers").then((r) => r.data.transfers);
}
export function createStockTransfer(input: {
  fromBatchId: string;
  fromRacewayId: string;
  toBatchId: string;
  toRacewayId: string;
  count: number;
  reason?: string;
  date: string;
}) {
  return apiClient.post<{ transfer: StockTransfer }>("/stock-transfers", input).then((r) => r.data.transfer);
}

// ── Feed stock thresholds ───────────────────────────────────────────────
export function fetchFeedStockThresholds() {
  return apiClient.get<{ thresholds: FeedStockThreshold[] }>("/feed-catalog/thresholds").then((r) => r.data.thresholds);
}
export function setFeedStockThreshold(pelletSizeId: string, thresholdKg: number) {
  return apiClient
    .put<{ threshold: FeedStockThreshold }>("/feed-catalog/thresholds", { pelletSizeId, thresholdKg })
    .then((r) => r.data.threshold);
}
export function clearFeedStockThreshold(pelletSizeId: string) {
  return apiClient.delete(`/feed-catalog/thresholds/${pelletSizeId}`);
}
