import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import * as otpAuth from "../../lib/otpAuth";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!organizationName.trim() || !name.trim() || !email.trim() || password.length < 8 || !phone.trim()) {
      setError("Fill in every field — password needs at least 8 characters, phone needs a country code (e.g. +1…).");
      return;
    }
    setLoading(true);
    try {
      await otpAuth.startVerification(phone.trim());
      navigation.navigate("VerifyOtp", {
        organizationName: organizationName.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      });
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Set up your farm</Text>
        <Text style={styles.subtitle}>Create an organization and owner account</Text>

        {error && <ErrorBanner message={error} />}

        <FormField label="Farm / organization name" value={organizationName} onChangeText={setOrganizationName} placeholder="Blue Trout Farm" />
        <FormField label="Your name" value={name} onChangeText={setName} placeholder="Alice Owner" />
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@farm.com"
        />
        <FormField
          label="Phone (with country code)"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          keyboardType="phone-pad"
          placeholder="+1 650 555 3434"
        />
        <FormField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="At least 8 characters"
        />

        <PrimaryButton title="Send verification code" onPress={onSubmit} loading={loading} />

        <View style={styles.footer}>
          <PrimaryButton title="Back to login" variant="secondary" onPress={() => navigation.navigate("Login")} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f4f7f7" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 26, fontWeight: "800", color: "#0b6e6e", textAlign: "center" },
  subtitle: { fontSize: 15, color: "#5c6b6b", textAlign: "center", marginBottom: 32, marginTop: 4 },
  footer: { marginTop: 16 },
});
