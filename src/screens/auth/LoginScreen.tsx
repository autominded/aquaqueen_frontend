import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import { AuthShell } from "../../components/AuthShell";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <AuthShell eyebrow="AQUACULTURE OPERATING SYSTEM" title="Run your farm with clarity." subtitle="Operations, fish health, harvest and finance in one place.">

        {error && <ErrorBanner message={error} />}

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@farm.com"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
        />
        <FormField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        <PrimaryButton title="Log in" onPress={onSubmit} loading={loading} />

          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.footer}><Text style={styles.footerText}>New to AquaQueen?</Text><PrimaryButton title="Sign up" variant="secondary" onPress={() => navigation.navigate("Signup")} /></View>
        </AuthShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ocean }, container: { flexGrow: 1 },
  forgotLink: { textAlign: "center", color: colors.teal, fontSize: 13, fontWeight: "700", marginTop: 16 },
  footer: { marginTop: 24, alignItems: "stretch", gap: 8 },
  footerText: { textAlign: "center", color: colors.inkMuted, marginBottom: 10, fontSize: 13 },
});
