import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { createTeamMember } from "../../api/users";
import { fetchRoles } from "../../api/roles";
import { LoadingView } from "../../components/LoadingView";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "NewTeamMember">;

export function NewTeamMemberScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({ queryKey: ["roles"], queryFn: fetchRoles });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);

  const roles = rolesQuery.data ?? [];
  const selectedRoleId = roleId ?? roles[0]?.id;

  const mutation = useMutation({
    mutationFn: () =>
      createTeamMember({ name: name.trim(), email: email.trim(), password, roleId: selectedRoleId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      navigation.goBack();
    },
  });

  const canSubmit = name.trim() && email.trim() && password.length >= 8 && !!selectedRoleId;

  if (rolesQuery.isPending) return <LoadingView />;
  if (rolesQuery.isError) return <ErrorBanner message={apiErrorMessage(rolesQuery.error)} onRetry={rolesQuery.refetch} />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <FormField label="Name" value={name} onChangeText={setName} placeholder="Casey Rivers" />
      <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="casey@example.com" />
      <FormField
        label="Temporary password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="At least 8 characters"
      />

      <Text style={styles.label}>Role</Text>
      <View style={styles.chipRow}>
        {roles.map((r) => (
          <PrimaryButton
            key={r.id}
            title={r.name}
            variant={selectedRoleId === r.id ? "primary" : "secondary"}
            onPress={() => setRoleId(r.id)}
            style={styles.chip}
          />
        ))}
      </View>

      <PrimaryButton title="Add team member" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, minWidth: 90 },
});
