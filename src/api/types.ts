export type BatchStage = "FINGERLING" | "JUVENILE" | "ADULT" | "BROODER";
export type BatchStatus = "ACTIVE" | "HARVESTED" | "CLOSED";
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
  phone?: string | null;
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
  deactivatedAt: string | null;
  role: RoleRef;
  organization: { id: string; name: string; lockedAt: string | null };
}

export interface AdminOrganization {
  id: string;
  name: string;
  createdAt: string;
  lockedAt: string | null;
  userCount: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: RoleRef;
  createdAt: string;
  deactivatedAt: string | null;
}

export interface RacewayStocking {
  id: string;
  batchId: string;
  racewayId: string;
  raceway: { id: string; name: string };
  initialCount: number;
  currentCount: number;
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
  stockings: RacewayStocking[];
}

export interface FeedEntry {
  id: string;
  batchId: string;
  racewayId?: string | null;
  pelletSizeId?: string | null;
  feedManufacturerId?: string | null;
  date: string;
  feedType: string;
  quantityKg: number;
  notes?: string | null;
  createdAt: string;
}

export interface SamplingEntry {
  id: string;
  batchId: string;
  racewayId?: string | null;
  date: string;
  avgWeightG: number;
  sampleSize: number;
  notes?: string | null;
  createdAt: string;
}

export interface MortalityEntry {
  id: string;
  batchId: string;
  racewayId?: string | null;
  date: string;
  count: number;
  cause?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

// Measurements are nullable now that monitoring devices write here too.
// Probes are sold separately from the node, so a device may only ever report
// water temperature — and a farmer logging by hand may likewise have measured
// only what they had a meter for.
//
// Absent must render as "—", never as 0. A raceway with no dissolved-oxygen
// probe and a raceway whose oxygen has crashed are not the same thing, and
// only one of them is an emergency.
export interface WaterQualityReading {
  id: string;
  batchId: string;
  racewayId?: string | null;
  date: string;
  temperatureC?: number | null;
  dissolvedOxygen?: number | null;
  ph?: number | null;
  ammonia?: number | null;
  notes?: string | null;
  // Set when this row was rolled up from a device rather than typed in.
  deviceId?: string | null;
  createdAt: string;
}

export interface HatcheryBatch {
  id: string;
  organizationId: string;
  broodstockId?: string | null;
  broodstock?: { id: string; species: string } | null;
  trayId?: string | null;
  tray?: { id: string; name: string } | null;
  species: string;
  eggCount: number;
  currentCount: number;
  strippingDate?: string | null;
  startDate: string;
  expectedHatchDate: string;
  eyedDate?: string | null;
  hatchedDate?: string | null;
  stage: HatcheryStage;
  status: HatcheryStatus;
  notes?: string | null;
  createdAt: string;
}

export interface HatcheryMortalityEntry {
  id: string;
  hatcheryBatchId: string;
  date: string;
  count: number;
  cause?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface HatcheryBatchSale {
  id: string;
  hatcheryBatchId: string;
  date: string;
  quantity: number;
  pricePerPiece: number;
  buyerName?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type StrippingPlanStatus = "PLANNED" | "COMPLETED";

export interface Broodstock {
  id: string;
  organizationId: string;
  racewayId: string;
  raceway?: { id: string; name: string };
  species: string;
  count: number;
  stockedDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface PhotoperiodEntry {
  id: string;
  broodstockId: string;
  date: string;
  lightHours: number;
  notes?: string | null;
  createdAt: string;
}

export interface StrippingPlan {
  id: string;
  broodstockId: string;
  plannedDate: string;
  status: StrippingPlanStatus;
  notes?: string | null;
  createdAt: string;
}

export interface Tray {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  organizationId: string;
  batchId?: string | null;
  batch?: { id: string; code: string; species: string } | null;
  name: string;
  unit: ProductUnit;
  price: number;
  availableQty: number;
  avgWeightG?: number | null;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  product?: { name: string };
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  pieceCount?: number | null;
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
  contact?: { name: string; phone?: string | null } | null;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  createdById: string;
  createdAt: string;
  items: SaleItem[];
  payments: SalePayment[];
}

export type RacewayPurpose = "FARM" | "HATCHERY";

export interface Raceway {
  id: string;
  farmId: string;
  name: string;
  lengthM: number;
  widthM: number;
  depthM: number;
  purpose: RacewayPurpose;
  createdAt: string;
  updatedAt: string;
}

// Same row as Raceway, returned by /hatchery-raceways with the broodstock
// currently housed in it — the hatchery screen's whole reason to exist.
export interface HatcheryRaceway extends Raceway {
  broodstocks: { id: string; species: string; count: number }[];
}

export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type LeaveType = "SICK" | "CASUAL" | "EARNED" | "UNPAID";

export interface Employee {
  id: string;
  name: string;
  designation?: string | null;
  phone?: string | null;
  monthlySalary?: number | null;
  joinDate: string;
  status: EmployeeStatus;
  notes?: string | null;
  createdAt: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  accountId: string;
  amount: number;
  periodMonth: string;
  date: string;
  notes?: string | null;
  createdAt: string;
}

export interface EmployeeExpense {
  id: string;
  employeeId: string;
  accountId: string;
  amount: number;
  description: string;
  date: string;
  notes?: string | null;
  createdAt: string;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface Farm {
  id: string;
  organizationId: string;
  systemType: FarmSystemType;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  photoUrl?: string | null;
  logoUrl?: string | null;
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
  // Which unit a device that has never chosen one starts on for raceway
  // dimensions. Stored values are always metres — this is display only.
  defaultLengthUnit: LengthUnitSetting;
}

export type LengthUnitSetting = "METRE" | "CENTIMETRE" | "FOOT";

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
  defaultLengthUnit: LengthUnitSetting;
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

export interface FeedManufacturer {
  id: string;
  name: string;
}

export interface Species {
  id: string;
  name: string;
}

export interface MortalityCause {
  id: string;
  name: string;
}

export interface FarmInventoryItem {
  id: string;
  name: string;
  quantityOnHand: number;
  lowStockThreshold?: number | null;
}

export interface FarmInventoryItemEntry {
  id: string;
  itemId: string;
  quantity: number;
  purchasePrice: number;
  billUrl?: string | null;
  date: string;
  notes?: string | null;
  createdAt: string;
}

export interface PelletSize {
  id: string;
  label: string;
}

export interface FeedInventoryByManufacturer {
  feedManufacturerId: string;
  name: string;
  stockKg: number;
}

export interface FeedInventoryItem {
  pelletSizeId: string;
  label: string;
  purchasedKg: number;
  consumedKg: number;
  stockKg: number;
  byManufacturer: FeedInventoryByManufacturer[];
}

export interface FeedInventoryLedgerEntry {
  id: string;
  date: string;
  quantityKg: number;
  batchCode: string;
  racewayName: string | null;
  manufacturerName: string | null;
  notes: string | null;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  pelletSizeId: string;
  pelletSize?: { label: string };
  bagWeightKg: number;
  numberOfBags: number;
  ratePerBag: number;
  lineTotal: number;
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
  receiptUrl?: string | null;
  createdById: string;
  createdAt: string;
  feedManufacturerId?: string | null;
  feedManufacturer?: { name: string } | null;
  items: PurchaseItem[];
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
  totalFingerlings: number;
  totalRaceways: number;
  estimatedBiomassKg: number;
  feedGivenLast7dKg: number;
  mortalityLast7d: number;
  activeHatcheryBatches: number;
}

export interface RacewayOverview {
  id: string;
  name: string;
  lengthM: number;
  widthM: number;
  depthM: number;
  batchCount: number;
  fishCount: number;
  fingerlings: number;
  biomassKg: number;
}

export interface DashboardAlert {
  id: string;
  batchId?: string;
  batchCode?: string;
  type: string;
  title: string;
  message: string;
}

export interface DashboardFarmStatus {
  activeBroodstock: number;
  hatcheryBatchesInProgress: number;
  fryConversionPct: number | null;
  activeEmployees: number;
  employeesOnLeaveToday: number;
}

export interface DashboardFinanceGlance {
  totalReceivable: number;
  totalPayable: number;
  feedAlertsCount: number;
  farmInventoryItemCount: number;
}

export interface RacewayGrowthPrediction {
  status: "salable" | "projecting" | "insufficient_data";
  estimatedDate?: string;
  daysRemaining?: number;
}

export type AdvisorySeverity = "INFO" | "WARNING" | "CRITICAL";
export type AdvisoryType = "WEATHER" | "TEMPERATURE" | "NEWS" | "GENERAL";

export interface Advisory {
  id: string;
  title: string;
  body: string;
  severity: AdvisorySeverity;
  type: AdvisoryType;
  expiresAt: string;
  createdById: string;
  createdAt: string;
}

export interface AdminAdvisory extends Advisory {
  createdBy: { id: string; name: string };
  _count: { dismissals: number };
}

export interface IndustryPost {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  createdById: string;
  createdAt: string;
}

export interface AdminIndustryPost extends IndustryPost {
  createdBy: { id: string; name: string };
}

export type MarketplaceCategory = "EQUIPMENT" | "LIVESTOCK" | "FEED_SUPPLIES";
export type MarketplaceStatus = "ACTIVE" | "SOLD" | "REMOVED";

export interface MarketplaceListing {
  id: string;
  category: MarketplaceCategory;
  title: string;
  description: string;
  price: number;
  priceUnit?: string | null;
  imageUrl?: string | null;
  status: MarketplaceStatus;
  organizationId: string;
  organization: { id: string; name: string };
  createdAt: string;
}

export interface MarketplaceOrgRef {
  id: string;
  name: string;
}

export interface MarketplaceMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: { id: string; name: string };
  body: string;
  createdAt: string;
}

export interface MarketplaceConversationSummary {
  id: string;
  listing: { id: string; title: string; imageUrl?: string | null; price: number; priceUnit?: string | null };
  counterparty: MarketplaceOrgRef;
  lastMessage: MarketplaceMessage | null;
  createdAt: string;
}

export interface MarketplaceConversationDetail {
  id: string;
  listingId: string;
  buyerOrganizationId: string;
  sellerOrganizationId: string;
  listing: { id: string; title: string; imageUrl?: string | null; price: number; priceUnit?: string | null };
  createdAt: string;
}

export interface RacewayOperations {
  raceway: { id: string; name: string; lengthM: number; widthM: number; depthM: number };
  stockings: {
    id: string;
    initialCount: number;
    currentCount: number;
    createdAt: string;
    batch: { id: string; code: string; species: string; stage: BatchStage; status: BatchStatus };
    totalFeedKg: number;
    assumedFcr: number;
    biomassFromFeedKg: number;
    biomassFromSamplingKg: number | null;
    fcrFromSampling: number | null;
    prediction: RacewayGrowthPrediction | null;
  }[];
  latestSampling: SamplingEntry | null;
  latestWaterQuality: WaterQualityReading | null;
}

// ── Operations: tasks & reminders ──────────────────────────────────────
export type TaskStatus = "PENDING" | "DONE";
export type RecurrenceType = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
export type RepairPriority = "LOW" | "NORMAL" | "URGENT";

interface TaskPerson {
  id: string;
  name: string;
}

export interface DailyTask {
  id: string;
  title: string;
  notes?: string | null;
  dueDate: string;
  recurrence: RecurrenceType;
  assignedTo?: TaskPerson | null;
  status: TaskStatus;
  completedAt?: string | null;
  completedBy?: TaskPerson | null;
  createdBy: TaskPerson;
  createdAt: string;
}

export interface CleaningChecklistItem {
  id: string;
  label: string;
  done: boolean;
  order: number;
}

export interface CleaningTask {
  id: string;
  title: string;
  raceway?: { id: string; name: string } | null;
  dueDate: string;
  recurrence: RecurrenceType;
  assignedTo?: TaskPerson | null;
  status: TaskStatus;
  completedAt?: string | null;
  completedBy?: TaskPerson | null;
  notes?: string | null;
  createdBy: TaskPerson;
  createdAt: string;
  checklistItems: CleaningChecklistItem[];
}

export interface WaterChangeTask {
  id: string;
  raceway?: { id: string; name: string } | null;
  dueDate: string;
  recurrence: RecurrenceType;
  percentPlanned?: number | null;
  assignedTo?: TaskPerson | null;
  status: TaskStatus;
  completedAt?: string | null;
  completedBy?: TaskPerson | null;
  notes?: string | null;
  createdBy: TaskPerson;
  createdAt: string;
}

export interface RepairTask {
  id: string;
  title: string;
  description?: string | null;
  raceway?: { id: string; name: string } | null;
  priority: RepairPriority;
  dueDate?: string | null;
  assignedTo?: TaskPerson | null;
  status: TaskStatus;
  completedAt?: string | null;
  completedBy?: TaskPerson | null;
  createdBy: TaskPerson;
  createdAt: string;
}

export interface StockTransfer {
  id: string;
  fromBatch: { id: string; code: string; species: string };
  fromRaceway: { id: string; name: string };
  toBatch: { id: string; code: string; species: string };
  toRaceway: { id: string; name: string };
  count: number;
  reason?: string | null;
  date: string;
  createdBy: TaskPerson;
  createdAt: string;
}

export interface FeedStockThreshold {
  pelletSizeId: string;
  label: string;
  thresholdKg: number;
}

// ── IoT monitoring devices ──────────────────────────────────────────────
// Firmware lives in D:\iot; the wire format these mirror is specified in
// D:\iot\docs\MQTT.md. Kept hand-synced with the Prisma models, same as
// every other type in this file — there's no codegen.

// Channel names are the contract with the firmware. Adding one means
// touching aq_channel_type_t in aq_config.h, the server's schemas/devices.ts
// and this list, in the same change.
export type DeviceChannel =
  | "temperature"
  | "dissolved_oxygen"
  | "ph"
  | "ammonia"
  | "turbidity"
  | "tds"
  | "ec"
  | "water_level"
  | "flow";

export type DeviceOutput = "aerator" | "pump" | "valve" | "aux";

export type DeviceStatus = "UNCLAIMED" | "ONLINE" | "OFFLINE";

export type DeviceAlertKind =
  | "THRESHOLD_BREACH"
  | "SENSOR_FAULT"
  | "DEVICE_OFFLINE"
  | "FAILSAFE_ENGAGED"
  | "BUFFER_OVERFLOW";

export interface DeviceChannelConfig {
  type: DeviceChannel;
  enabled: boolean;
  pin?: number;
  aux_pin?: number;
  // Meaning is per channel type — the layout is documented in
  // aq_sensors.h. The app only ever writes these through the calibration
  // wizard, which is why they're an opaque number[] here.
  cal?: number[];
}

export interface DeviceThreshold {
  // null clears a bound; undefined leaves it unchanged. The firmware relies
  // on that distinction, so the app must preserve it rather than
  // normalising both to undefined.
  min?: number | null;
  max?: number | null;
  hysteresis?: number;
  drives?: DeviceOutput | null;
}

export interface DeviceConfig {
  sample_interval_s: number;
  publish_interval_s: number;
  failsafe_timeout_s: number;
  channels: DeviceChannelConfig[];
  thresholds: Partial<Record<DeviceChannel, DeviceThreshold>>;
}

// Every measurement is nullable. An absent value means "no probe fitted" or
// "probe faulted" — never zero. Rendering a missing reading as 0 would show
// a fish kill on a farm that simply hasn't bought that probe.
export interface DeviceReading {
  id: string;
  seq: number;
  recordedAt: string;
  receivedAt: string;
  buffered: boolean;
  clockUnsynced: boolean;
  temperatureC?: number | null;
  dissolvedOxygen?: number | null;
  ph?: number | null;
  ammonia?: number | null;
  turbidityNtu?: number | null;
  tdsPpm?: number | null;
  ecUsCm?: number | null;
  waterLevelM?: number | null;
  flowLpm?: number | null;
  outputs?: Partial<Record<DeviceOutput, boolean>> | null;
  health?: {
    uptime_s?: number;
    rssi?: number;
    free_heap?: number;
    fw?: string;
    failsafe?: boolean;
    buffered?: number;
    sensor_faults?: DeviceChannel[];
  } | null;
}

export interface DeviceAlert {
  id: string;
  kind: DeviceAlertKind;
  channel?: DeviceChannel | null;
  value?: number | null;
  message: string;
  raisedAt: string;
  clearedAt?: string | null;
  acknowledgedAt?: string | null;
}

export interface Device {
  id: string;
  deviceId: string;
  name: string;
  raceway?: { id: string; name: string } | null;
  status: DeviceStatus;
  // Derived server-side from lastSeenAt rather than read off `status`, which
  // can be stale if a node lost power without a clean disconnect.
  online: boolean;
  firmwareVersion?: string | null;
  lastSeenAt?: string | null;
  lastRssi?: number | null;
  config?: DeviceConfig | null;
  configRev: number;
  createdAt: string;
  // Present on the list endpoint only.
  latestReading?: DeviceReading | null;
  openAlerts?: number;
}
