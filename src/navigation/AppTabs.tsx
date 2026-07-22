import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AppTabParamList } from "./types";
import { DashboardScreen } from "../screens/DashboardScreen";
import { BatchesStack } from "./BatchesStack";
import { HatcheryDashboardScreen } from "../screens/hatchery/HatcheryDashboardScreen";
import { SalesStack } from "./SalesStack";
import { PurchasesStack } from "./PurchasesStack";
import { ProfileStack } from "./ProfileStack";

const Tab = createBottomTabNavigator<AppTabParamList>();

// Plain emoji instead of an icon font — avoids a web font-loading dependency
// for a v1 tab bar.
const TAB_ICONS: Record<keyof AppTabParamList, string> = {
  Dashboard: "🏠",
  Batches: "🐟",
  Hatchery: "🥚",
  Sales: "💵",
  Purchases: "🧾",
  Profile: "👤",
};

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTintColor: "#0b6e6e",
        tabBarActiveTintColor: "#0b6e6e",
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>{TAB_ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Batches" component={BatchesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Hatchery" component={HatcheryDashboardScreen} options={{ title: "Hatchery" }} />
      <Tab.Screen name="Sales" component={SalesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Purchases" component={PurchasesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
