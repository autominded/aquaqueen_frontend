import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";

type Props = NativeStackScreenProps<ProfileStackParamList, "Profile">;

const MENU: {
  key: "FarmSetup" | "Team" | "Roles" | "AdminUsers" | "AdminSettings";
  title: string;
  subtitle: string;
  permission?: string;
}[] = [
  { key: "FarmSetup", title: "Farm setup", subtitle: "Raceways, system type, location and photo" },
  { key: "Team", title: "Team", subtitle: "See who has access and add new members", permission: "users.manage" },
  { key: "Roles", title: "Roles", subtitle: "Manage what each role can do", permission: "roles.manage" },
  { key: "AdminUsers", title: "Admin", subtitle: "Every user across every farm" },
  { key: "AdminSettings", title: "Platform settings", subtitle: "Firebase and Google Maps credentials for the whole app" },
];

export function ProfileScreen({ navigation }: Props) {
  const { user, logout, hasPermission, isImpersonating, stopImpersonating } = useAuth();

  const menu = MENU.filter((item) => {
    if (item.key === "AdminUsers" || item.key === "AdminSettings") return !!user?.isSuperAdmin && !isImpersonating;
    return !item.permission || hasPermission(item.permission);
  });

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

      <Card>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.meta}>{user?.email}</Text>
        <Text style={styles.meta}>{user?.role.name} · {user?.organizationName}</Text>
      </Card>

      {menu.map((item) => (
        <TouchableOpacity key={item.key} onPress={() => navigation.navigate(item.key)}>
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
            <Text style={styles.meta}>{item.subtitle}</Text>
          </Card>
        </TouchableOpacity>
      ))}

      <PrimaryButton title="Log out" variant="secondary" onPress={logout} style={styles.logoutButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  name: { fontSize: 17, fontWeight: "700", color: "#1c2424" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowTitle: { fontSize: 15, fontWeight: "700", color: "#1c2424" },
  chevron: { fontSize: 20, color: "#7a8787" },
  logoutButton: { marginTop: 8, marginHorizontal: 16 },
  impersonationCard: { backgroundColor: "#fff4e5" },
  impersonationText: { fontSize: 13, fontWeight: "700", color: "#8a5a00" },
  impersonationButton: { marginTop: 10 },
});
