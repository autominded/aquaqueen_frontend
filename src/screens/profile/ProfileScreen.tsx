import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { AppIcon } from "../../components/AppIcon";
import { UnitPreferenceCard } from "../../components/UnitPreferenceCard";
import { hatcheryChunk } from "../../navigation/hatcheryChunk";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

const MENU: {
  key: "FarmSetup" | "Hatchery" | "Team" | "Roles" | "AdminUsers" | "AdminOrganizations" | "AdminSettings" | "FeedCatalog" | "Species" | "MortalityCauses" | "AdminAdvisories" | "IndustryUpdates" | "AdminIndustryPosts" | "MarketplaceHome";
  title: string;
  subtitle: string;
  permission?: string;
  // Platform-wide, not org-scoped — kept in their own "Super admin" section
  // below rather than mixed into the regular menu.
  superAdminOnly?: boolean;
}[] = [
  { key: "FarmSetup", title: "Farm setup", subtitle: "Raceways, system type, location and photo" },
  { key: "Hatchery", title: "Hatchery", subtitle: "Broodstock, egg & fingerling batches, trays" },
  { key: "Team", title: "Team", subtitle: "See who has access and add new members", permission: "users.manage" },
  { key: "Roles", title: "Roles", subtitle: "Manage what each role can do", permission: "roles.manage" },
  { key: "MarketplaceHome", title: "Marketplace", subtitle: "Buy and sell equipment, livestock, feed & supplies" },
  { key: "IndustryUpdates", title: "Industry updates", subtitle: "News and updates from AquaQueen" },
  { key: "AdminUsers", title: "Admin", subtitle: "Every user across every farm", superAdminOnly: true },
  { key: "AdminOrganizations", title: "Organizations", subtitle: "Lock, resume or remove a farm's access", superAdminOnly: true },
  { key: "AdminAdvisories", title: "Advisories", subtitle: "Push weather, temperature or news alerts to every user", superAdminOnly: true },
  { key: "AdminIndustryPosts", title: "Manage industry updates", subtitle: "Publish news and updates for every user", superAdminOnly: true },
  { key: "AdminSettings", title: "Platform settings", subtitle: "Firebase and Google Maps credentials for the whole app", superAdminOnly: true },
  { key: "FeedCatalog", title: "Feed catalog", subtitle: "Manufacturers and pellet sizes every farm picks from", superAdminOnly: true },
  { key: "Species", title: "Species", subtitle: "The species list every farm's New Batch screen picks from", superAdminOnly: true },
  { key: "MortalityCauses", title: "Mortality causes", subtitle: "The dropdown options every farm's mortality entry picks from", superAdminOnly: true },
];

// Hatchery is the one menu item routed to a lazily-loaded stack (see
// hatcheryChunk.ts) — awaiting it first avoids the URL-flicker race
// documented in lazyStack.tsx (navigating before the chunk resolves briefly
// shows the wrong URL, then corrects itself a render later). Every other
// item is a plain, already-loaded screen within this same stack, so it
// navigates immediately as before.
async function navigateToMenuItem(navigation: Props["navigation"], key: string) {
  if (key === "Hatchery") await hatcheryChunk.ensureLoaded();
  navigation.navigate(key as never);
}

export function ProfileScreen({ navigation }: Props) {
  const { user, logout, hasPermission, isImpersonating, stopImpersonating } = useAuth();
  const [unitsExpanded, setUnitsExpanded] = useState(false);

  // Warms the Hatchery chunk in the background while this screen is being
  // looked at, so tapping it is normally already resolved by the time
  // navigateToMenuItem's await runs.
  useEffect(() => {
    hatcheryChunk.ensureLoaded();
  }, []);

  const menu = MENU.filter((item) => !item.superAdminOnly && (!item.permission || hasPermission(item.permission)));
  const superAdminMenu = user?.isSuperAdmin && !isImpersonating ? MENU.filter((item) => item.superAdminOnly) : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isImpersonating && (
        <Card style={styles.impersonationCard}>
          <Text style={styles.impersonationText}>
            Viewing {user?.organizationName} as {user?.name}
          </Text>
          <PrimaryButton title="Back to my profile" onPress={stopImpersonating} style={styles.impersonationButton} />
        </Card>
      )}

      <View style={styles.identityCard}>
        <View style={styles.identityAvatar}><Text style={styles.identityInitial}>{user?.name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.identityCopy}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.meta}>{user?.role.name} · {user?.organizationName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phone && <Text style={styles.email}>{user.phone}</Text>}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("EditProfile")} accessibilityLabel="Edit profile" style={styles.editIcon}>
          <AppIcon name="edit" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      {menu.map((item) => (
        <TouchableOpacity key={item.key} onPress={() => navigateToMenuItem(navigation, item.key)}>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <AppIcon name="chevron-right" />
            </View>
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
          </Card>
        </TouchableOpacity>
      ))}

      {superAdminMenu.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Super admin</Text>
          {superAdminMenu.map((item) => (
            <TouchableOpacity key={item.key} onPress={() => navigation.navigate(item.key as never)}>
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <AppIcon name="chevron-right" />
                </View>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </>
      )}

      <TouchableOpacity onPress={() => setUnitsExpanded((v) => !v)}>
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.rowTitle}>Display units</Text>
            <AppIcon name={unitsExpanded ? "chevron-up" : "chevron-down"} />
          </View>
          <Text style={styles.menuSubtitle}>Pick each independently — mix and match to how your farm actually measures things.</Text>
        </Card>
      </TouchableOpacity>
      {unitsExpanded && <UnitPreferenceCard showHeader={false} />}

      <PrimaryButton title="Log out" variant="secondary" onPress={logout} style={styles.logoutButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  identityCard: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  identityAvatar: { backgroundColor: colors.teal, width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }, identityInitial: { color: colors.white, fontSize: 20, fontWeight: "800" }, identityCopy: { flex: 1 },
  name: { fontSize: 18, fontWeight: "800", color: colors.white },
  meta: { fontSize: 13, color: "#D5E8E5", marginTop: 3 }, email: { fontSize: 12, color: "#BBD9D5", marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: colors.teal, letterSpacing: 0.4, marginTop: 20, marginBottom: 8, marginHorizontal: 16 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
  menuSubtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  logoutButton: { marginTop: 8, marginHorizontal: 16 },
  impersonationCard: { backgroundColor: "#fff4e5" },
  impersonationText: { fontSize: 13, fontWeight: "700", color: "#8a5a00" },
  impersonationButton: { marginTop: 10 },
  editIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
});
