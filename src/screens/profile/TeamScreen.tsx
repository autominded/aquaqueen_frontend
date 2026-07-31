import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { fetchTeam } from "../../api/users";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { apiErrorMessage } from "../../api/client";
import { StatusPill } from "../../components/StatusPill";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<ProfileStackParamList, "Team">;

export function TeamScreen({ navigation }: Props) {
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
  });

  if (isPending) return <LoadingView />;
  if (isError) return <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>PEOPLE</Text><Text style={styles.heading}>Team</Text></View>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("NewTeamMember")} accessibilityLabel="Add a team member">
          <Text style={styles.addButtonText}>Add member</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<EmptyState title="No team members yet" />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.name}>{item.name}</Text>
              <StatusPill label={item.role.name} tone="neutral" />
            </View>
            <Text style={styles.meta}>{item.email}</Text>
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
