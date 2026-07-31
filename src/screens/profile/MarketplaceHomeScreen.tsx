import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { Card } from "../../components/Card";
import { AppIcon } from "../../components/AppIcon";
import { useAuth } from "../../context/AuthContext";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "MarketplaceHome">;

export function MarketplaceHomeScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();

  const menu: {
    title: string;
    subtitle: string;
    icon: React.ComponentProps<typeof AppIcon>["name"];
    onPress: () => void;
  }[] = [
    { title: "Browse listings", subtitle: "Equipment, livestock and feed & supplies from other farms", icon: "shopping-bag", onPress: () => navigation.navigate("MarketplaceBrowse", { mine: false }) },
    { title: "My listings", subtitle: "What your farm has posted", icon: "tag", onPress: () => navigation.navigate("MarketplaceBrowse", { mine: true }) },
    { title: "Messages", subtitle: "Conversations with buyers and sellers", icon: "message-circle", onPress: () => navigation.navigate("MarketplaceConversations") },
  ];

  if (hasPermission("marketplace.manage")) {
    menu.push({ title: "New listing", subtitle: "Post something for other farms to see", icon: "plus-circle", onPress: () => navigation.navigate("NewMarketplaceListing") });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.eyebrow}>MARKETPLACE</Text>
          <Text style={styles.heroTitle}>Buy and sell with other farms</Text>
          <Text style={styles.heroText}>Equipment, livestock, feed & supplies.</Text>
        </View>
        <AppIcon name="shopping-bag" size={28} color="#D5E8E5" />
      </View>

      {menu.map((item) => (
        <TouchableOpacity key={item.title} onPress={item.onPress}>
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
  hero: { backgroundColor: colors.ocean, borderRadius: 22, padding: 20, flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  eyebrow: { color: "#BBD9D5", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroTitle: { color: colors.white, fontSize: 22, fontWeight: "800", marginTop: 4 },
  heroText: { color: "#D5E8E5", fontSize: 13, marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.tealSoft, justifyContent: "center", alignItems: "center", marginRight: 14 },
  textColumn: { flex: 1 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 3 },
});
