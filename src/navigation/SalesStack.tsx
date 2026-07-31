import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SalesStackParamList } from "./types";
import { POSScreen } from "../screens/sales/POSScreen";
import { NewProductScreen } from "../screens/sales/NewProductScreen";
import { SalesHistoryScreen } from "../screens/sales/SalesHistoryScreen";
import { RecordSalePaymentScreen } from "../screens/sales/RecordSalePaymentScreen";
import { EditSaleScreen } from "../screens/sales/EditSaleScreen";
import { stackScreenOptions } from "../theme";

const Stack = createNativeStackNavigator<SalesStackParamList>();

export function SalesStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="POS" component={POSScreen} options={{ title: "Point of Sale" }} />
      <Stack.Screen name="NewProduct" component={NewProductScreen} options={{ title: "List for sale" }} />
      <Stack.Screen name="SalesHistory" component={SalesHistoryScreen} options={{ title: "Sales history" }} />
      <Stack.Screen name="RecordSalePayment" component={RecordSalePaymentScreen} options={{ title: "Record payment" }} />
      <Stack.Screen name="EditSale" component={EditSaleScreen} options={{ title: "Edit sale" }} />
    </Stack.Navigator>
  );
}
