import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { createContact } from "../../api/contacts";
import { ContactType } from "../../api/types";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<PurchasesStackParamList, "NewContact">;

const TYPES: { value: ContactType; label: string }[] = [
  { value: "SUPPLIER", label: "Supplier" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "BOTH", label: "Both" },
];

export function NewContactScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<ContactType>("SUPPLIER");
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createContact({
        type,
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        // "+91" alone means the user never actually typed a number — don't
        // save a bare country code as if it were one.
        phone: phone.trim() && phone.trim() !== "+91" ? phone.trim() : undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      navigation.goBack();
    },
  });

  const canSubmit = name.trim().length > 0;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {mutation.isError && <ErrorBanner message={apiErrorMessage(mutation.error)} />}

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

      <FormField label="Name" value={name} onChangeText={setName} placeholder="Lakeside Feed Co." />
      <FormField label="Contact name (optional)" value={contactName} onChangeText={setContactName} placeholder="Jamie Rivers" />
      <FormField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
      <FormField label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="orders@lakesidefeed.com" />
      <FormField label="Address (optional)" value={address} onChangeText={setAddress} placeholder="45 Mill Road" />
      <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline placeholder="Net-30 terms, delivers Tuesdays" />
      <PrimaryButton title="Save contact" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  chipRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  chip: { flex: 1 },
});
