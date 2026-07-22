export type BatchStage = "FRY" | "FINGERLING" | "JUVENILE" | "ADULT";
export type BatchStatus = "ACTIVE" | "HARVESTED" | "CLOSED";
export type HarvestPlanStatus = "PLANNED" | "COMPLETED" | "CANCELLED";
export type HatcheryStage = "EGG" | "EYED" | "HATCHED" | "FRY";
export type HatcheryStatus = "ACTIVE" | "CLOSED";
export type ProductUnit = "KG" | "PIECE";
export type AccountType = "CASH" | "BANK";
export type FarmSystemType = "RAS" | "FLOW_THROUGH";
export type PurchaseCategory =
  | "FEED"
  | "FINGERLINGS_EGGS"
  | "CHEMICALS_TREATMENTS"
  | "MEDICATION"
  | "EQUIPMENT"
  | "PACKAGING_ICE"
  | "FUEL_UTILITIES"
  | "MAINTENANCE_SUPPLIES"
  | "OTHER";
export type ContactType = "SUPPLIER" | "CUSTOMER" | "BOTH";
export type PaymentStatus = "PAID" | "DUE" | "PARTIAL";

export interface RoleRef {
  id: string;
  name: string;
}

export interface Role extends RoleRef {
  isSystem: boolean;
  permissions: string[];
}

export interface Permission {
  key: string;
  label: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: RoleRef;
  permissions: string[];
  organizationId: string;
  organizationName: string;
  isSuperAdmin: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  role: RoleRef;
  organization: { id: string; name: string };
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: RoleRef;
  createdAt: string;
}

export interface Batch {
  id: string;
  organizationId: string;
  code: string;
  species: string;
  stage: BatchStage;
  location: string;
  startDate: string;
  initialCount: number;
  currentCount: number;
  status: BatchStatus;
  createdAt: string;
}

export interface FeedEntry {
  id: string;
  batchId: string;
  date: string;
  feedType: string;
  quantityKg: number;
  notes?: string | null;
  createdAt: string;
}

export interface SamplingEntry {
  id: string;
  batchId: string;
  date: string;
  avgWeightG: number;
  sampleSize: number;
  notes?: string | null;
  createdAt: string;
}

export interface MortalityEntry {
  id: string;
  batchId: string;
  date: string;
  count: number;
  cause?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface WaterQualityReading {
  id: string;
  batchId: string;
  date: string;
  temperatureC: number;
  dissolvedOxygen: number;
  ph: number;
  ammonia: number;
  notes?: string | null;
  createdAt: string;
}

export interface HarvestPlan {
  id: string;
  batchId: string;
  plannedDate: string;
  targetWeightG: number;
  targetCount: number;
  status: HarvestPlanStatus;
  notes?: string | null;
  createdAt: string;
}

export interface HatcheryBatch {
  id: string;
  organizationId: string;
  species: string;
  eggCount: number;
  startDate: string;
  expectedHatchDate: string;
  stage: HatcheryStage;
  status: HatcheryStatus;
  notes?: string | null;
  createdAt: string;
}

export interface HarvestPlanWithBatch extends HarvestPlan {
  batch: { code: string; species: string };
}

export interface Product {
  id: string;
  organizationId: string;
  harvestPlanId: string;
  name: string;
  unit: ProductUnit;
  price: number;
  availableQty: number;
  createdAt: string;
  harvestPlan?: HarvestPlanWithBatch;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  product?: { name: string };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SalePayment {
  id: string;
  saleId: string;
  accountId: string;
  account?: { name: string; type: AccountType };
  amount: number;
}

export interface Sale {
  id: string;
  organizationId: string;
  contactId?: string | null;
  contact?: { name: string } | null;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  createdById: string;
  createdAt: string;
  items: SaleItem[];
  payments: SalePayment[];
}

export interface Raceway {
  id: string;
  farmId: string;
  name: string;
  lengthM: number;
  widthM: number;
  depthM: number;
  createdAt: string;
  updatedAt: string;
}

export interface Farm {
  id: string;
  organizationId: string;
  systemType: FarmSystemType;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  photoUrl?: string | null;
  registrationNumber?: string | null;
  registrationDocUrl?: string | null;
  identityProofUrl?: string | null;
  raceways: Raceway[];
  createdAt: string;
  updatedAt: string;
}

export interface PlatformPublicConfig {
  firebase: {
    apiKey: string | null;
    authDomain: string | null;
    projectId: string | null;
    storageBucket: string | null;
    messagingSenderId: string | null;
    appId: string | null;
  };
  googleMapsApiKey: string | null;
}

export interface PlatformSettings {
  id: string;
  firebaseApiKey?: string | null;
  firebaseAuthDomain?: string | null;
  firebaseProjectId?: string | null;
  firebaseStorageBucket?: string | null;
  firebaseMessagingSenderId?: string | null;
  firebaseAppId?: string | null;
  googleMapsApiKey?: string | null;
  firebaseServiceAccountJson?: string | null;
  updatedAt: string;
}

export interface Contact {
  id: string;
  organizationId: string;
  type: ContactType;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface PurchasePayment {
  id: string;
  purchaseId: string;
  accountId: string;
  account?: { name: string; type: AccountType };
  amount: number;
}

export interface Purchase {
  id: string;
  organizationId: string;
  contactId?: string | null;
  contact?: { name: string } | null;
  category: PurchaseCategory;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  paymentStatus: PaymentStatus;
  purchaseDate: string;
  notes?: string | null;
  createdById: string;
  createdAt: string;
  payments: PurchasePayment[];
}

export interface Account {
  id: string;
  organizationId: string;
  type: AccountType;
  name: string;
  isClosed: boolean;
  createdAt: string;
  deletedAt?: string | null;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export type LedgerSourceType = "SALE" | "PURCHASE" | "OPENING_BALANCE" | "TRANSFER" | "DEPOSIT";

export interface LedgerTransaction {
  id: string;
  accountId: string;
  type: "DEBIT" | "CREDIT";
  description: string;
  amount: number;
  sourceType: LedgerSourceType;
  sourceId?: string | null;
  operationDate: string;
}

export interface Ledger {
  accounts: AccountWithBalance[];
  transactions: LedgerTransaction[];
}

export interface DashboardSummary {
  totalActiveBatches: number;
  totalFishCount: number;
  estimatedBiomassKg: number;
  feedGivenLast7dKg: number;
  mortalityLast7d: number;
  activeHatcheryBatches: number;
}

export interface DashboardAlert {
  batchId: string;
  batchCode: string;
  type: string;
  message: string;
}
