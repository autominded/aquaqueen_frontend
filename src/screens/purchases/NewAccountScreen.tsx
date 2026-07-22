import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { createAccount } from "../../api/accounts";
import { AccountType } from "../../api/types";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<PurchasesStackParamList, "NewAccount">;

const TYPES: { value: AccountType; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
];

export function NewAccountScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("BANK");
  const [openingBalance, setOpeningBalance] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createAccount({
        name: name.trim(),
        type,
        openingBalance: Number(openingBalance) > 0 ? Number(openingBalance) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      navigation.goBack();
    },
  });

  const canSubmit = name.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

      <FormField label="Account name" value={name} onChangeText={setName} placeholder="Chase Bank" />

      <Text style={styles.label}>Type</Text>
      <View style={styles.chipRow}>
        {TYPES.map((t) => (
          <PrimaryButton
            key={t.value}
            title={t.label}
            variant={type === t.value ? "primary" : "secondary"}
            onPress={() => setType(t.value)}
            style={styles.chip}
          />
        ))}
      </View>

      <FormField
        label="Opening balance (optional)"
        value={openingBalance}
        onChangeText={setOpeningBalance}
        keyboardType="numeric"
        placeholder="0.00"
      />

      <PrimaryButton title="Create account" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f4f7f7", flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { flex: 1 },
});
