import React, { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "../../navigation/types";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import * as otpAuth from "../../lib/otpAuth";
import { AuthShell } from "../../components/AuthShell";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const onSubmit = async () => {
    setError(null);
    // Firebase always reports the verified number back in strict E.164 (no
    // spaces) — strip whitespace here so what we send to Firebase and what
    // we later compare server-side against the verified token are the same
    // string, regardless of how the user chose to space it out while typing
    // (the placeholder itself suggests "+91 98765 43210").
    const normalizedPhone = phone.replace(/\s+/g, "");
    if (!organizationName.trim() || !name.trim() || !email.trim() || password.length < 8 || normalizedPhone === "+91") {
      setError("Fill in every field — password needs at least 8 characters, phone needs a country code (e.g. +91…).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await otpAuth.startVerification(normalizedPhone);
      navigation.navigate("VerifyOtp", {
        organizationName: organizationName.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
        phone: normalizedPhone,
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
        <AuthShell eyebrow="GET STARTED" title="Build your farm command center." subtitle="Create your organisation and take control of production, finance and traceability.">

        {error && <ErrorBanner message={error} />}

        <FormField
          label="Farm / organization name"
          value={organizationName}
          onChangeText={setOrganizationName}
          placeholder="Blue Trout Farm"
          returnKeyType="next"
          onSubmitEditing={() => nameRef.current?.focus()}
          blurOnSubmit={false}
        />
        <FormField
          ref={nameRef}
          label="Your name"
          value={name}
          onChangeText={setName}
          placeholder="Alice Owner"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          blurOnSubmit={false}
        />
        <FormField
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@farm.com"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          blurOnSubmit={false}
        />
        <FormField
          ref={phoneRef}
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          autoCapitalize="none"
          keyboardType="phone-pad"
          placeholder="+91 98765 43210"
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
          placeholder="At least 8 characters"
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          blurOnSubmit={false}
        />
        <FormField
          ref={confirmPasswordRef}
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Re-enter your password"
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />

        <PrimaryButton title="Send OTP on Mobile" onPress={onSubmit} loading={loading} />

          <View style={styles.footer}><PrimaryButton title="Back to sign in" variant="ghost" onPress={() => navigation.navigate("Login")} /></View>
        </AuthShell>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ocean }, container: { flexGrow: 1 },
  footer: { marginTop: 16 },
});
