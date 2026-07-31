import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "./types";
import { PurchasesHomeScreen } from "../screens/purchases/PurchasesHomeScreen";
import { NewPurchaseScreen } from "../screens/purchases/NewPurchaseScreen";
import { PurchaseHistoryScreen } from "../screens/purchases/PurchaseHistoryScreen";
import { ContactsScreen } from "../screens/purchases/ContactsScreen";
import { NewContactScreen } from "../screens/purchases/NewContactScreen";
import { LedgerScreen } from "../screens/purchases/LedgerScreen";
import { AccountsScreen } from "../screens/purchases/AccountsScreen";
import { NewAccountScreen } from "../screens/purchases/NewAccountScreen";
import { AccountDetailScreen } from "../screens/purchases/AccountDetailScreen";
import { TransferFundsScreen } from "../screens/purchases/TransferFundsScreen";
import { DepositFundsScreen } from "../screens/purchases/DepositFundsScreen";
import { RecordPurchasePaymentScreen } from "../screens/purchases/RecordPurchasePaymentScreen";
import { EditPurchaseScreen } from "../screens/purchases/EditPurchaseScreen";
import { FeedInventoryScreen } from "../screens/purchases/FeedInventoryScreen";
import { FarmInventoryScreen } from "../screens/purchases/FarmInventoryScreen";
import { AddFarmInventoryEntryScreen } from "../screens/purchases/AddFarmInventoryEntryScreen";
import { EmployeesScreen } from "../screens/purchases/EmployeesScreen";
import { EmployeeDetailScreen } from "../screens/purchases/EmployeeDetailScreen";
import { stackScreenOptions } from "../theme";

const Stack = createNativeStackNavigator<PurchasesStackParamList>();

export function PurchasesStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="PurchasesHome" component={PurchasesHomeScreen} options={{ title: "Purchases" }} />
      <Stack.Screen name="NewPurchase" component={NewPurchaseScreen} options={{ title: "New purchase" }} />
      <Stack.Screen name="PurchaseHistory" component={PurchaseHistoryScreen} options={{ title: "Purchase history" }} />
      <Stack.Screen name="Contacts" component={ContactsScreen} options={{ title: "Contacts" }} />
      <Stack.Screen name="NewContact" component={NewContactScreen} options={{ title: "New contact" }} />
      <Stack.Screen name="Ledger" component={LedgerScreen} options={{ title: "Ledger" }} />
      <Stack.Screen name="Accounts" component={AccountsScreen} options={{ title: "Accounts" }} />
      <Stack.Screen name="NewAccount" component={NewAccountScreen} options={{ title: "New account" }} />
      <Stack.Screen name="AccountDetail" component={AccountDetailScreen} options={{ title: "Account" }} />
      <Stack.Screen name="TransferFunds" component={TransferFundsScreen} options={{ title: "Transfer funds" }} />
      <Stack.Screen name="DepositFunds" component={DepositFundsScreen} options={{ title: "Deposit" }} />
      <Stack.Screen name="RecordPurchasePayment" component={RecordPurchasePaymentScreen} options={{ title: "Record payment" }} />
      <Stack.Screen name="EditPurchase" component={EditPurchaseScreen} options={{ title: "Edit purchase" }} />
      <Stack.Screen name="FeedInventory" component={FeedInventoryScreen} options={{ title: "Feed inventory" }} />
      <Stack.Screen name="FarmInventory" component={FarmInventoryScreen} options={{ title: "Farm inventory" }} />
      <Stack.Screen name="AddFarmInventoryEntry" component={AddFarmInventoryEntryScreen} options={{ title: "Add stock" }} />
      <Stack.Screen name="Employees" component={EmployeesScreen} options={{ title: "Employees" }} />
      <Stack.Screen name="EmployeeDetail" component={EmployeeDetailScreen} options={{ title: "Employee" }} />
    </Stack.Navigator>
  );
}
