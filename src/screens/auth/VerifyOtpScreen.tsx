import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import * as otpAuth from "../../lib/otpAuth";
import { AuthShell } from "../../components/AuthShell";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyOtp">;

export function VerifyOtpScreen({ route }: Props) {
  const { organizationName, name, email, password, phone } = route.params;
  const { signup } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code sent to your phone.");
      return;
    }
    setLoading(true);
    try {
      const firebaseIdToken = await otpAuth.confirmCode(code.trim());
      await signup(organizationName, name, email, password, phone, firebaseIdToken);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <AuthShell eyebrow="SECURE SETUP" title="Verify your phone." subtitle={`We sent a six-digit code to ${phone}.`}>

        {error && <ErrorBanner message={error} />}

        <FormField
          label="Verification code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="123456"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

          <PrimaryButton title="Verify & create account" onPress={onSubmit} loading={loading} />
        </AuthShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ocean }, container: { flexGrow: 1 },
});
