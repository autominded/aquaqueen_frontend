import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "./types";
import { BatchListScreen } from "../screens/batches/BatchListScreen";
import { NewBatchScreen } from "../screens/batches/NewBatchScreen";
import { BatchDetailsScreen } from "../screens/batches/BatchDetailsScreen";
import { FeedEntryScreen } from "../screens/batches/FeedEntryScreen";
import { SamplingEntryScreen } from "../screens/batches/SamplingEntryScreen";
import { MortalityEntryScreen } from "../screens/batches/MortalityEntryScreen";
import { WaterQualityEntryScreen } from "../screens/batches/WaterQualityEntryScreen";
import { HarvestPlanningScreen } from "../screens/batches/HarvestPlanningScreen";

const Stack = createNativeStackNavigator<BatchesStackParamList>();

export function BatchesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: "#0b6e6e" }}>
      <Stack.Screen name="BatchList" component={BatchListScreen} options={{ title: "Batches" }} />
      <Stack.Screen name="NewBatch" component={NewBatchScreen} options={{ title: "New batch" }} />
      <Stack.Screen name="BatchDetails" component={BatchDetailsScreen} options={{ title: "Batch details" }} />
      <Stack.Screen name="FeedEntry" component={FeedEntryScreen} options={{ title: "Add feed" }} />
      <Stack.Screen name="SamplingEntry" component={SamplingEntryScreen} options={{ title: "Add sampling" }} />
      <Stack.Screen name="MortalityEntry" component={MortalityEntryScreen} options={{ title: "Add mortality" }} />
      <Stack.Screen name="WaterQualityEntry" component={WaterQualityEntryScreen} options={{ title: "Water quality" }} />
      <Stack.Screen name="HarvestPlanning" component={HarvestPlanningScreen} options={{ title: "Harvest planning" }} />
    </Stack.Navigator>
  );
}
