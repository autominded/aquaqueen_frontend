import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import * as otpAuth from "../../lib/otpAuth";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "VerifyProfileOtp">;

export function VerifyProfileOtpScreen({ route, navigation }: Props) {
  const { name, email, phone, verifyPhone } = route.params;
  const { updateProfile } = useAuth();
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
      await updateProfile({ name, email, phone, firebaseIdToken });
      navigation.popToTop();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error && <ErrorBanner message={error} />}
      <Text style={styles.subtitle}>We sent a six-digit code to {verifyPhone}.</Text>

      <FormField
        label="Verification code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        placeholder="123456"
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />

      <PrimaryButton title="Verify & save" onPress={onSubmit} loading={loading} style={styles.saveButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  subtitle: { fontSize: 13, color: colors.inkMuted, marginBottom: 16, lineHeight: 18 },
  saveButton: { marginTop: 4 },
});
