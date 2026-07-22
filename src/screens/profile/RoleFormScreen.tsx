import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { createRole, fetchPermissionCatalog, fetchRoles, updateRole } from "../../api/roles";
import { LoadingView } from "../../components/LoadingView";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<ProfileStackParamList, "RoleForm">;

export function RoleFormScreen({ route, navigation }: Props) {
  const { roleId } = route.params;
  const isEditing = !!roleId;
  const queryClient = useQueryClient();

  const permissionsQuery = useQuery({ queryKey: ["permission-catalog"], queryFn: fetchPermissionCatalog });
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const [seeded, setSeeded] = useState(false);
  const [name, setName] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    if (seeded || !isEditing || !rolesQuery.data) return;
    const role = rolesQuery.data.find((r) => r.id === roleId);
    if (role) {
      setName(role.name);
      setSelectedKeys(role.permissions);
      setSeeded(true);
    }
  }, [seeded, isEditing, roleId, rolesQuery.data]);

  const togglePermission = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const mutation = useMutation({
    mutationFn: () =>
      isEditing
        ? updateRole(roleId!, { name: name.trim(), permissionKeys: selectedKeys })
        : createRole({ name: name.trim(), permissionKeys: selectedKeys }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      navigation.goBack();
    },
  });

  const canSubmit = name.trim().length > 0;

  if (permissionsQuery.isPending || (isEditing && rolesQuery.isPending)) return <LoadingView />;
  if (permissionsQuery.isError) return <ErrorBanner message={apiErrorMessage(permissionsQuery.error)} onRetry={permissionsQuery.refetch} />;
  if (rolesQuery.isError) return <ErrorBanner message={apiErrorMessage(rolesQuery.error)} onRetry={rolesQuery.refetch} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <FormField label="Role name" value={name} onChangeText={setName} placeholder="Field Supervisor" />

      <Text style={styles.label}>Permissions</Text>
      <View style={styles.chipRow}>
        {permissionsQuery.data.map((p) => (
          <PrimaryButton
            key={p.key}
            title={p.label}
            variant={selectedKeys.includes(p.key) ? "primary" : "secondary"}
            onPress={() => togglePermission(p.key)}
            style={styles.chip}
          />
        ))}
      </View>

      <PrimaryButton
        title={isEditing ? "Save role" : "Create role"}
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={!canSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, minWidth: 140 },
});
