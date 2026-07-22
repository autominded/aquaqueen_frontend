import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { fetchContacts } from "../../api/contacts";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { PrimaryButton } from "../../components/PrimaryButton";
import { apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

type Props = NativeStackScreenProps<PurchasesStackParamList, "Contacts">;

const TYPE_LABEL: Record<string, string> = { SUPPLIER: "Supplier", CUSTOMER: "Customer", BOTH: "Supplier & Customer" };

export function ContactsScreen({ navigation }: Props) {
  const { hasPermission } = useAuth();
  const { data, isPending, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => fetchContacts(),
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      {hasPermission("contacts.manage") && (
        <View style={styles.header}>
          <PrimaryButton title="+ New contact" onPress={() => navigation.navigate("NewContact")} />
        </View>
      )}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<EmptyState title="No contacts yet" subtitle="Add the suppliers you buy from and customers you sell to." />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.type}>{TYPE_LABEL[item.type]}</Text>
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
  container: { flex: 1, backgroundColor: "#f4f7f7" },
  header: { padding: 16, paddingBottom: 4 },
  emptyContainer: { flexGrow: 1, justifyContent: "center" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "700", color: "#1c2424" },
  type: { fontSize: 12, fontWeight: "700", color: "#0b6e6e" },
  meta: { fontSize: 13, color: "#7a8787", marginTop: 4 },
});
