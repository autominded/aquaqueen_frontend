import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { Card } from "../../components/Card";
import { useAuth } from "../../context/AuthContext";
import { AppIcon } from "../../components/AppIcon";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<PurchasesStackParamList, "PurchasesHome">;

const MENU: {
  key: "NewPurchase" | "PurchaseHistory" | "Contacts" | "Ledger" | "Accounts" | "FeedInventory" | "FarmInventory" | "Employees";
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof AppIcon>["name"];
  permission?: string;
}[] = [
  { key: "NewPurchase", title: "New purchase", subtitle: "Log feed, fingerlings, chemicals, and more", icon: "plus-circle", permission: "purchases.manage" },
  { key: "PurchaseHistory", title: "Purchase history", subtitle: "See everything the farm has bought", icon: "clock" },
  { key: "FeedInventory", title: "Feed inventory", subtitle: "Stock on hand per pellet size", icon: "package" },
  { key: "FarmInventory", title: "Farm inventory", subtitle: "Equipment and supplies stock, bills and purchase price", icon: "box" },
  { key: "Employees", title: "Employees", subtitle: "Salary, expenses and leaves", icon: "users", permission: "employees.manage" },
  { key: "Contacts", title: "Contacts", subtitle: "Suppliers you buy from, customers you sell to", icon: "users" },
  { key: "Ledger", title: "Ledger", subtitle: "Cash & bank balances and transactions", icon: "book-open" },
  { key: "Accounts", title: "Accounts", subtitle: "Manage cash, bank, transfers and deposits", icon: "briefcase", permission: "accounts.manage" },
];

export function PurchasesHomeScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {MENU.filter((item) => !item.permission || hasPermission(item.permission)).map((item) => (
        <TouchableOpacity key={item.key} onPress={() => navigation.navigate(item.key)}>
          <Card>
            <View style={styles.row}>
              <View style={styles.icon}><AppIcon name={item.icon} size={20} color={colors.teal} /></View>
              <View style={styles.textColumn}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
              <AppIcon name="chevron-right" />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.tealSoft, justifyContent: "center", alignItems: "center", marginRight: 14 },
  textColumn: { flex: 1 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 3 },
});
