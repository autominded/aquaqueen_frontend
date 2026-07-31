import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HatcheryStackParamList } from "./types";
import { HatcheryHomeScreen } from "../screens/hatchery/HatcheryHomeScreen";
import { BroodstockScreen } from "../screens/hatchery/BroodstockScreen";
import { BroodstockDetailScreen } from "../screens/hatchery/BroodstockDetailScreen";
import { HatcheryBatchesScreen } from "../screens/hatchery/HatcheryBatchesScreen";
import { HatcheryBatchDetailScreen } from "../screens/hatchery/HatcheryBatchDetailScreen";
import { TraysScreen } from "../screens/hatchery/TraysScreen";
import { stackScreenOptions } from "../theme";

const Stack = createNativeStackNavigator<HatcheryStackParamList>();

export function HatcheryStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="HatcheryHome" component={HatcheryHomeScreen} options={{ title: "Hatchery" }} />
      <Stack.Screen name="Broodstock" component={BroodstockScreen} options={{ title: "Broodstock" }} />
      <Stack.Screen name="BroodstockDetail" component={BroodstockDetailScreen} options={{ title: "Broodstock" }} />
      <Stack.Screen name="HatcheryBatches" component={HatcheryBatchesScreen} options={{ title: "Egg & fingerling batches" }} />
      <Stack.Screen name="HatcheryBatchDetail" component={HatcheryBatchDetailScreen} options={{ title: "Batch" }} />
      <Stack.Screen name="Trays" component={TraysScreen} options={{ title: "Trays" }} />
    </Stack.Navigator>
  );
}
