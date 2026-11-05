import { NavigatorScreenParams } from "@react-navigation/native";
import { DeviceChannel } from "../api/types";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyOtp: { organizationName: string; name: string; email: string; password: string; phone: string };
  ForgotPassword: undefined;
  ResetPasswordOtp: { phone: string };
};

export type BatchesStackParamList = {
  OperationsHome: undefined;
  BatchList: undefined;
  NewBatch: undefined;
  BatchDetails: { batchId: string };
  EditBatch: { batchId: string };
  RacewayOperations: { racewayId: string };
  FeedEntry: { batchId: string; racewayId?: string };
  SamplingEntry: { batchId: string; racewayId?: string };
  MortalityEntry: { batchId: string; racewayId?: string };
  WaterQualityEntry: { batchId: string; racewayId?: string };
  TasksHome: undefined;
  DailyTasks: undefined;
  CleaningTasks: undefined;
  WaterChangeTasks: undefined;
  RepairTasks: undefined;
  StockTransfers: undefined;
  // Monitoring devices sit in the Operations tab rather than getting one of
  // their own: they're an input to raceway operations, not a separate domain,
  // and the tab bar is already at five.
  Devices: undefined;
  AddDevice: undefined;
  DeviceDetail: { deviceId: string };
  DeviceSettings: { deviceId: string };
  DeviceChannels: { deviceId: string };
  DeviceThresholds: { deviceId: string };
  DeviceCalibration: { deviceId: string; channel: DeviceChannel };
};

export type SalesStackParamList = {
  // batchId/racewayId: preloads the "Plan harvest" quick-list card at the
  // top of POS — see RacewayOperationsScreen/BatchDetailsScreen.
  POS: { batchId?: string; racewayId?: string } | undefined;
  NewProduct: undefined;
  SalesHistory: undefined;
  RecordSalePayment: { saleId: string };
  EditSale: { saleId: string };
};

export type HatcheryStackParamList = {
  HatcheryHome: undefined;
  Broodstock: undefined;
  BroodstockDetail: { broodstockId: string };
  HatcheryBatches: undefined;
  HatcheryBatchDetail: { hatcheryBatchId: string };
  Trays: undefined;
  HatcheryRaceways: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  FarmSetup: undefined;
  Team: undefined;
  NewTeamMember: undefined;
  Roles: undefined;
  RoleForm: { roleId?: string };
  AdminUsers: undefined;
  AdminOrganizations: undefined;
  AdminSettings: undefined;
  FeedCatalog: undefined;
  Species: undefined;
  AdminAdvisories: undefined;
  IndustryUpdates: undefined;
  AdminIndustryPosts: undefined;
  MarketplaceHome: undefined;
  MarketplaceBrowse: { mine?: boolean };
  NewMarketplaceListing: undefined;
  MarketplaceListingDetail: { listingId: string };
  MarketplaceConversations: undefined;
  MarketplaceConversation: { conversationId: string };
  EditProfile: undefined;
  VerifyProfileOtp: { name: string; email: string; phone: string; verifyPhone: string };
  ChangePassword: undefined;
  Hatchery: NavigatorScreenParams<HatcheryStackParamList>;
  MortalityCauses: undefined;
};

export type PurchasesStackParamList = {
  PurchasesHome: undefined;
  NewPurchase: undefined;
  PurchaseHistory: undefined;
  Contacts: undefined;
  NewContact: undefined;
  Ledger: undefined;
  Accounts: undefined;
  NewAccount: undefined;
  AccountDetail: { accountId: string };
  TransferFunds: undefined;
  DepositFunds: { accountId?: string };
  RecordPurchasePayment: { purchaseId: string };
  EditPurchase: { purchaseId: string };
  FeedInventory: undefined;
  FarmInventory: undefined;
  AddFarmInventoryEntry: { itemId: string; itemName: string };
  Employees: undefined;
  EmployeeDetail: { employeeId: string };
};

export type AppTabParamList = {
  Dashboard: undefined;
  Batches: NavigatorScreenParams<BatchesStackParamList>;
  Sales: NavigatorScreenParams<SalesStackParamList>;
  Purchases: NavigatorScreenParams<PurchasesStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};
