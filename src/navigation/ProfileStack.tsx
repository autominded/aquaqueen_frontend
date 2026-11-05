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
import { AdminOrganizationsScreen } from "../screens/profile/AdminOrganizationsScreen";
import { AdminSettingsScreen } from "../screens/profile/AdminSettingsScreen";
import { FeedCatalogScreen } from "../screens/profile/FeedCatalogScreen";
import { SpeciesScreen } from "../screens/profile/SpeciesScreen";
import { MortalityCausesScreen } from "../screens/profile/MortalityCausesScreen";
import { AdminAdvisoriesScreen } from "../screens/profile/AdminAdvisoriesScreen";
import { IndustryUpdatesScreen } from "../screens/profile/IndustryUpdatesScreen";
import { AdminIndustryPostsScreen } from "../screens/profile/AdminIndustryPostsScreen";
import { MarketplaceHomeScreen } from "../screens/profile/MarketplaceHomeScreen";
import { MarketplaceBrowseScreen } from "../screens/profile/MarketplaceBrowseScreen";
import { NewMarketplaceListingScreen } from "../screens/profile/NewMarketplaceListingScreen";
import { MarketplaceListingDetailScreen } from "../screens/profile/MarketplaceListingDetailScreen";
import { MarketplaceConversationsScreen } from "../screens/profile/MarketplaceConversationsScreen";
import { MarketplaceConversationScreen } from "../screens/profile/MarketplaceConversationScreen";
import { EditProfileScreen } from "../screens/profile/EditProfileScreen";
import { VerifyProfileOtpScreen } from "../screens/profile/VerifyProfileOtpScreen";
import { ChangePasswordScreen } from "../screens/profile/ChangePasswordScreen";
import { stackScreenOptions } from "../theme";
import { hatcheryChunk } from "./hatcheryChunk";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "My profile" }} />
      <Stack.Screen name="FarmSetup" component={FarmSetupScreen} options={{ title: "Farm setup" }} />
      <Stack.Screen name="Team" component={TeamScreen} options={{ title: "Team" }} />
      <Stack.Screen name="NewTeamMember" component={NewTeamMemberScreen} options={{ title: "Add team member" }} />
      <Stack.Screen name="Roles" component={RolesScreen} options={{ title: "Roles" }} />
      <Stack.Screen name="RoleForm" component={RoleFormScreen} options={{ title: "Role" }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: "All users" }} />
      <Stack.Screen name="AdminOrganizations" component={AdminOrganizationsScreen} options={{ title: "Organizations" }} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: "Platform settings" }} />
      <Stack.Screen name="FeedCatalog" component={FeedCatalogScreen} options={{ title: "Feed catalog" }} />
      <Stack.Screen name="Species" component={SpeciesScreen} options={{ title: "Species" }} />
      <Stack.Screen name="MortalityCauses" component={MortalityCausesScreen} options={{ title: "Mortality causes" }} />
      <Stack.Screen name="AdminAdvisories" component={AdminAdvisoriesScreen} options={{ title: "Advisories" }} />
      <Stack.Screen name="IndustryUpdates" component={IndustryUpdatesScreen} options={{ title: "Industry updates" }} />
      <Stack.Screen name="AdminIndustryPosts" component={AdminIndustryPostsScreen} options={{ title: "Industry updates" }} />
      <Stack.Screen name="MarketplaceHome" component={MarketplaceHomeScreen} options={{ title: "Marketplace" }} />
      <Stack.Screen name="MarketplaceBrowse" component={MarketplaceBrowseScreen} options={{ title: "Marketplace" }} />
      <Stack.Screen name="NewMarketplaceListing" component={NewMarketplaceListingScreen} options={{ title: "New listing" }} />
      <Stack.Screen name="MarketplaceListingDetail" component={MarketplaceListingDetailScreen} options={{ title: "Listing" }} />
      <Stack.Screen name="MarketplaceConversations" component={MarketplaceConversationsScreen} options={{ title: "Messages" }} />
      <Stack.Screen name="MarketplaceConversation" component={MarketplaceConversationScreen} options={{ title: "Conversation" }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: "Edit profile" }} />
      <Stack.Screen name="VerifyProfileOtp" component={VerifyProfileOtpScreen} options={{ title: "Verify phone" }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change password" }} />
      <Stack.Screen name="Hatchery" component={hatcheryChunk.LazyStack} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
