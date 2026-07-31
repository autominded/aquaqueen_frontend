import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { changePassword } from "../../api/auth";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { notify } from "../../lib/notify";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "ChangePassword">;

export function ChangePasswordScreen({ navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const onSave = async () => {
    setError(null);
    if (!currentPassword) {
      setError("Enter your current password.");
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
      await changePassword({ currentPassword, newPassword });
      notify("Password changed", "Your password has been updated.");
      navigation.goBack();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {error && <ErrorBanner message={error} />}

      <FormField
        label="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        placeholder="••••••••"
        returnKeyType="next"
        onSubmitEditing={() => newRef.current?.focus()}
        blurOnSubmit={false}
      />
      <FormField
        ref={newRef}
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
        onSubmitEditing={onSave}
      />

      <PrimaryButton title="Change password" onPress={onSave} loading={loading} style={styles.saveButton} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  saveButton: { marginTop: 4 },
});
