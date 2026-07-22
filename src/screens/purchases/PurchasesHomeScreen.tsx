import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { Card } from "../../components/Card";
import { useAuth } from "../../context/AuthContext";

type Props = NativeStackScreenProps<PurchasesStackParamList, "PurchasesHome">;

const MENU: {
  key: "NewPurchase" | "PurchaseHistory" | "Contacts" | "Ledger" | "Accounts";
  title: string;
  subtitle: string;
  icon: string;
  permission?: string;
}[] = [
  { key: "NewPurchase", title: "New Purchase", subtitle: "Log feed, fingerlings, chemicals, and more", icon: "🧾", permission: "purchases.manage" },
  { key: "PurchaseHistory", title: "History", subtitle: "See everything the farm has bought", icon: "📜" },
  { key: "Contacts", title: "Contacts", subtitle: "Suppliers you buy from, customers you sell to", icon: "🏬" },
  { key: "Ledger", title: "Ledger", subtitle: "Cash & bank balances and transactions", icon: "📒" },
  { key: "Accounts", title: "Accounts", subtitle: "Manage cash/bank accounts, transfers and deposits", icon: "🏦", permission: "accounts.manage" },
];

export function PurchasesHomeScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {MENU.filter((item) => !item.permission || hasPermission(item.permission)).map((item) => (
        <TouchableOpacity key={item.key} onPress={() => navigation.navigate(item.key)}>
          <Card>
            <View style={styles.row}>
              <Text style={styles.icon}>{item.icon}</Text>
              <View style={styles.textColumn}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { fontSize: 24, marginRight: 14 },
  textColumn: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: "#1c2424" },
  subtitle: { fontSize: 13, color: "#7a8787", marginTop: 2 },
  chevron: { fontSize: 20, color: "#7a8787" },
});
