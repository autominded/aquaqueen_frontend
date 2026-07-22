export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyOtp: { organizationName: string; name: string; email: string; password: string; phone: string };
};

export type BatchesStackParamList = {
  BatchList: undefined;
  NewBatch: undefined;
  BatchDetails: { batchId: string };
  FeedEntry: { batchId: string };
  SamplingEntry: { batchId: string };
  MortalityEntry: { batchId: string };
  WaterQualityEntry: { batchId: string };
  HarvestPlanning: { batchId: string };
};

export type SalesStackParamList = {
  POS: undefined;
  NewProduct: undefined;
  SalesHistory: undefined;
  RecordSalePayment: { saleId: string };
  EditSale: { saleId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  FarmSetup: undefined;
  Team: undefined;
  NewTeamMember: undefined;
  Roles: undefined;
  RoleForm: { roleId?: string };
  AdminUsers: undefined;
  AdminSettings: undefined;
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
};

export type AppTabParamList = {
  Dashboard: undefined;
  Batches: undefined;
  Hatchery: undefined;
  Sales: undefined;
  Purchases: undefined;
  Profile: undefined;
};
