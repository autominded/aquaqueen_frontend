import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "./types";
import { OperationsHomeScreen } from "../screens/batches/OperationsHomeScreen";
import { RacewayOperationsScreen } from "../screens/batches/RacewayOperationsScreen";
import { BatchListScreen } from "../screens/batches/BatchListScreen";
import { NewBatchScreen } from "../screens/batches/NewBatchScreen";
import { BatchDetailsScreen } from "../screens/batches/BatchDetailsScreen";
import { EditBatchScreen } from "../screens/batches/EditBatchScreen";
import { FeedEntryScreen } from "../screens/batches/FeedEntryScreen";
import { SamplingEntryScreen } from "../screens/batches/SamplingEntryScreen";
import { MortalityEntryScreen } from "../screens/batches/MortalityEntryScreen";
import { WaterQualityEntryScreen } from "../screens/batches/WaterQualityEntryScreen";
import { TasksHomeScreen } from "../screens/batches/TasksHomeScreen";
import { DailyTasksScreen } from "../screens/batches/DailyTasksScreen";
import { CleaningTasksScreen } from "../screens/batches/CleaningTasksScreen";
import { WaterChangeTasksScreen } from "../screens/batches/WaterChangeTasksScreen";
import { RepairTasksScreen } from "../screens/batches/RepairTasksScreen";
import { StockTransfersScreen } from "../screens/batches/StockTransfersScreen";
import { DevicesScreen } from "../screens/devices/DevicesScreen";
import { AddDeviceScreen } from "../screens/devices/AddDeviceScreen";
import { DeviceDetailScreen } from "../screens/devices/DeviceDetailScreen";
import { DeviceSettingsScreen } from "../screens/devices/DeviceSettingsScreen";
import { DeviceChannelsScreen } from "../screens/devices/DeviceChannelsScreen";
import { DeviceThresholdsScreen } from "../screens/devices/DeviceThresholdsScreen";
import { DeviceCalibrationScreen } from "../screens/devices/DeviceCalibrationScreen";
import { stackScreenOptions } from "../theme";

const Stack = createNativeStackNavigator<BatchesStackParamList>();

export function BatchesStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="OperationsHome" component={OperationsHomeScreen} options={{ title: "Operations" }} />
      <Stack.Screen name="RacewayOperations" component={RacewayOperationsScreen} options={{ title: "Raceway" }} />
      <Stack.Screen name="BatchList" component={BatchListScreen} options={{ title: "Batches" }} />
      <Stack.Screen name="NewBatch" component={NewBatchScreen} options={{ title: "New batch" }} />
      <Stack.Screen name="BatchDetails" component={BatchDetailsScreen} options={{ title: "Batch details" }} />
      <Stack.Screen name="EditBatch" component={EditBatchScreen} options={{ title: "Edit batch" }} />
      <Stack.Screen name="FeedEntry" component={FeedEntryScreen} options={{ title: "Add feed" }} />
      <Stack.Screen name="SamplingEntry" component={SamplingEntryScreen} options={{ title: "Add sampling" }} />
      <Stack.Screen name="MortalityEntry" component={MortalityEntryScreen} options={{ title: "Add mortality" }} />
      <Stack.Screen name="WaterQualityEntry" component={WaterQualityEntryScreen} options={{ title: "Water quality" }} />
      <Stack.Screen name="TasksHome" component={TasksHomeScreen} options={{ title: "Tasks & reminders" }} />
      <Stack.Screen name="DailyTasks" component={DailyTasksScreen} options={{ title: "Daily tasks" }} />
      <Stack.Screen name="CleaningTasks" component={CleaningTasksScreen} options={{ title: "Farm cleaning" }} />
      <Stack.Screen name="WaterChangeTasks" component={WaterChangeTasksScreen} options={{ title: "Water changes" }} />
      <Stack.Screen name="RepairTasks" component={RepairTasksScreen} options={{ title: "Repairs" }} />
      <Stack.Screen name="StockTransfers" component={StockTransfersScreen} options={{ title: "Grading & transfer" }} />
      <Stack.Screen name="Devices" component={DevicesScreen} options={{ title: "Monitoring devices" }} />
      <Stack.Screen name="AddDevice" component={AddDeviceScreen} options={{ title: "Add a device" }} />
      <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: "Device" }} />
      <Stack.Screen name="DeviceSettings" component={DeviceSettingsScreen} options={{ title: "Name & raceway" }} />
      <Stack.Screen name="DeviceChannels" component={DeviceChannelsScreen} options={{ title: "Probes" }} />
      <Stack.Screen name="DeviceThresholds" component={DeviceThresholdsScreen} options={{ title: "Alert limits" }} />
      <Stack.Screen name="DeviceCalibration" component={DeviceCalibrationScreen} options={{ title: "Calibrate" }} />
    </Stack.Navigator>
  );
}
