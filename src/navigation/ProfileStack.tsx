import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "./types";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { FarmSetupScreen } from "../screens/profile/FarmSetupScreen";
import { TeamScreen } from "../screens/profile/TeamScreen";
import { NewTeamMemberScreen } from "../screens/profile/NewTeamMemberScreen";
import { RolesScreen } from "../screens/profile/RolesScreen";
import { RoleFormScreen } from "../screens/profile/RoleFormScreen";
import { AdminUsersScreen } from "../screens/profile/AdminUsersScreen";
import { AdminSettingsScreen } from "../screens/profile/AdminSettingsScreen";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: "#0b6e6e" }}>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My profile" }} />
      <Stack.Screen name="FarmSetup" component={FarmSetupScreen} options={{ title: "Farm setup" }} />
      <Stack.Screen name="Team" component={TeamScreen} options={{ title: "Team" }} />
      <Stack.Screen name="NewTeamMember" component={NewTeamMemberScreen} options={{ title: "Add team member" }} />
      <Stack.Screen name="Roles" component={RolesScreen} options={{ title: "Roles" }} />
      <Stack.Screen name="RoleForm" component={RoleFormScreen} options={{ title: "Role" }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: "All users" }} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: "Platform settings" }} />
    </Stack.Navigator>
  );
}
