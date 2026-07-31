import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { fetchContacts } from "../../api/contacts";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { StatusPill } from "../../components/StatusPill";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<PurchasesStackParamList, "Contacts">;

const TYPE_LABEL: Record<string, string> = { SUPPLIER: "Supplier", CUSTOMER: "Customer", BOTH: "Supplier & Customer" };

export function ContactsScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => fetchContacts(),
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      {hasPermission("contacts.manage") && (
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>NETWORK</Text><Text style={styles.heading}>Contacts</Text></View>
          <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("NewContact")} accessibilityLabel="Add a new contact">
            <Text style={styles.addButtonText}>New contact</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<EmptyState title="No contacts yet" subtitle="Add the suppliers you buy from and customers you sell to." />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.name}</Text>
              <StatusPill label={TYPE_LABEL[item.type]} tone="neutral" />
            </View>
            {(item.contactName || item.phone) && (
              <Text style={styles.meta}>{[item.contactName, item.phone].filter(Boolean).join(" · ")}</Text>
            )}
            {item.email && <Text style={styles.meta}>{item.email}</Text>}
            {item.address && <Text style={styles.meta}>{item.address}</Text>}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: colors.teal },
  heading: { color: colors.ocean, fontSize: 26, fontWeight: "800", marginTop: 3 },
  addButton: { backgroundColor: colors.teal, minHeight: 40, paddingHorizontal: 13, borderRadius: radii.sm, justifyContent: "center", alignItems: "center" },
  addButtonText: { color: colors.white, fontSize: 13, fontWeight: "800" },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
});
