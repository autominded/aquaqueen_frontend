import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput } from "react-native";
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

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPasswordOtp">;

export function ResetPasswordOtpScreen({ route }: Props) {
  const { phone } = route.params;
  const { resetPassword } = useAuth();
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    setError(null);
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code sent to your phone.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password needs at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const firebaseIdToken = await otpAuth.confirmCode(code.trim());
      await resetPassword(newPassword, firebaseIdToken);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <AuthShell eyebrow="RESET PASSWORD" title="Verify and set a new password." subtitle={`We sent a six-digit code to ${phone}.`}>
          {error && <ErrorBanner message={error} />}

          <FormField
            label="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="123456"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
          />
          <FormField
            ref={passwordRef}
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="••••••••"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            blurOnSubmit={false}
          />
          <FormField
            ref={confirmRef}
            label="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="••••••••"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />

          <PrimaryButton title="Reset password & log in" onPress={onSubmit} loading={loading} />
        </AuthShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ocean },
  container: { flexGrow: 1 },
});
