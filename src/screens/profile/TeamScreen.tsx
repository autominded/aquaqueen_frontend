import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { deactivateTeamMember, fetchTeam, reactivateTeamMember, updateTeamMemberRole } from "../../api/users";
import { fetchRoles } from "../../api/roles";
import { useAuth } from "../../context/AuthContext";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { apiErrorMessage } from "../../api/client";
import { StatusPill } from "../../components/StatusPill";
import { confirmAction } from "../../lib/confirm";
import { notify } from "../../lib/notify";
import { colors, radii } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<ProfileStackParamList, "Team">;

export function TeamScreen({ navigation }: Props) {
  const { refreshing, onRefresh } = useRefreshing();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["team"],
    queryFn: fetchTeam,
  });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const roleMutation = useMutation({
    mutationFn: ({ id, roleId }: { id: string; roleId: string }) => updateTeamMemberRole(id, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      setExpandedId(null);
    },
    onError: (err) => notify("Couldn't change role", apiErrorMessage(err)),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateTeamMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
    onError: (err) => notify("Couldn't deactivate", apiErrorMessage(err)),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateTeamMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
    onError: (err) => notify("Couldn't reactivate", apiErrorMessage(err)),
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
        renderItem={({ item }) => {
          const isSelf = item.id === currentUser?.id;
          const expanded = expandedId === item.id;
          return (
            <Card>
              <TouchableOpacity onPress={() => !isSelf && setExpandedId(expanded ? null : item.id)} disabled={isSelf}>
                <View style={styles.rowBetween}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.pillRow}>
                    {item.deactivatedAt && <StatusPill label="Deactivated" tone="critical" />}
                    <StatusPill label={item.role.name} tone="neutral" />
                  </View>
                </View>
                <Text style={styles.meta}>{item.email}</Text>
              </TouchableOpacity>

              {expanded && !isSelf && (
                <View style={styles.actions}>
                  <Text style={styles.actionsLabel}>Change role</Text>
                  <View style={styles.roleOptions}>
                    {(rolesQuery.data ?? []).map((role) => (
                      <TouchableOpacity
                        key={role.id}
                        style={[styles.roleOption, role.id === item.role.id && styles.roleOptionActive]}
                        onPress={() => role.id !== item.role.id && roleMutation.mutate({ id: item.id, roleId: role.id })}
                      >
                        <Text style={[styles.roleOptionText, role.id === item.role.id && styles.roleOptionTextActive]}>{role.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {item.deactivatedAt ? (
                    <TouchableOpacity
                      style={styles.reactivateButton}
                      onPress={() => reactivateMutation.mutate(item.id)}
                    >
                      <Text style={styles.reactivateButtonText}>Reactivate access</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.deactivateButton}
                      onPress={() =>
                        confirmAction(
                          {
                            title: "Deactivate this member?",
                            message: `${item.name} will immediately lose access to ${item.role.name === "Owner" ? "the farm" : "FarmFin"} — any active session ends right away, and they can't log back in until reactivated. Their past activity stays on record.`,
                            confirmLabel: "Deactivate",
                            destructive: true,
                          },
                          () => deactivateMutation.mutate(item.id)
                        )
                      }
                    >
                      <Text style={styles.deactivateButtonText}>Deactivate access</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          );
        }}
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
  pillRow: { flexDirection: "row", gap: 6 },
  name: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  actions: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  actionsLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  roleOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  roleOption: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: colors.surface },
  roleOptionActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  roleOptionText: { fontSize: 13, fontWeight: "700", color: colors.ink },
  roleOptionTextActive: { color: colors.white },
  deactivateButton: { paddingVertical: 10, alignItems: "center" },
  deactivateButtonText: { fontSize: 13, fontWeight: "800", color: colors.coral },
  reactivateButton: { paddingVertical: 10, alignItems: "center" },
  reactivateButtonText: { fontSize: 13, fontWeight: "800", color: colors.teal },
});
