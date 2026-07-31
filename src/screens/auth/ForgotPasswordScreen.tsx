import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import * as otpAuth from "../../lib/otpAuth";
import { AuthShell } from "../../components/AuthShell";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [phone, setPhone] = useState("+91 ");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const normalizedPhone = phone.replace(/\s+/g, "");
    if (normalizedPhone === "+91") {
      setError("Enter the phone number on your account, with country code (e.g. +91…).");
      return;
    }
    setLoading(true);
    try {
      await otpAuth.startVerification(normalizedPhone);
      navigation.navigate("ResetPasswordOtp", { phone: normalizedPhone });
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <AuthShell eyebrow="RESET PASSWORD" title="Forgot your password?" subtitle="Enter the phone number on your account — we'll text you a code to verify it's you.">
          {error && <ErrorBanner message={error} />}

          <FormField
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+91 98765 43210"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />

          <PrimaryButton title="Send code" onPress={onSubmit} loading={loading} />
        </AuthShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ocean },
  container: { flexGrow: 1 },
});
