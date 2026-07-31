import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileStackParamList } from "../../navigation/types";
import { useAuth } from "../../context/AuthContext";
import { updateOrganization } from "../../api/organization";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { ErrorBanner } from "../../components/ErrorBanner";
import { apiErrorMessage } from "../../api/client";
import * as otpAuth from "../../lib/otpAuth";
import { colors } from "../../theme";

type Props = NativeStackScreenProps<ProfileStackParamList, "EditProfile">;

export function EditProfileScreen({ navigation }: Props) {
  const { user, updateProfile, hasPermission } = useAuth();
  const canManageOrg = hasPermission("farm.manage");
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "+91 ");
  const [organizationName, setOrganizationName] = useState(user?.organizationName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const orgRef = useRef<TextInput>(null);

  const onSave = async () => {
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const rawPhone = phone.replace(/\s+/g, "");
    // A bare, untouched "+91" default means the user never actually
    // entered a number — treat it the same as empty, same convention as
    // SignupScreen/NewContactScreen.
    const normalizedPhone = rawPhone === "+91" ? "" : rawPhone;
    const trimmedOrgName = organizationName.trim();

    if (!trimmedName || !trimmedEmail) {
      setError("Name and email can't be empty.");
      return;
    }
    if (canManageOrg && !trimmedOrgName) {
      setError("Organization name can't be empty.");
      return;
    }

    const emailChanged = trimmedEmail !== user?.email;
    const phoneChanged = normalizedPhone !== (user?.phone ?? "");
    const orgNameChanged = canManageOrg && trimmedOrgName !== user?.organizationName;

    if (!emailChanged && !phoneChanged) {
      setLoading(true);
      try {
        if (orgNameChanged) await updateOrganization(trimmedOrgName);
        await updateProfile({ name: trimmedName });
        navigation.goBack();
      } catch (e) {
        setError(apiErrorMessage(e));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Changing email or phone needs a fresh phone verification — of the NEW
    // number if phone is changing, or of the EXISTING one otherwise (proof
    // it's really the account holder, since there's no way to verify a new
    // email address directly). Organization name doesn't need this — it's
    // saved up front since it's independent of the OTP-gated fields.
    const phoneToVerify = phoneChanged ? normalizedPhone : user?.phone;
    if (!phoneToVerify) {
      setError("Add and verify a phone number before changing your email.");
      return;
    }

    setLoading(true);
    try {
      if (orgNameChanged) await updateOrganization(trimmedOrgName);
      await otpAuth.startVerification(phoneToVerify);
      navigation.navigate("VerifyProfileOtp", { name: trimmedName, email: trimmedEmail, phone: normalizedPhone, verifyPhone: phoneToVerify });
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
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
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
        keyboardType="phone-pad"
        placeholder="+91 98765 43210"
        returnKeyType={canManageOrg ? "next" : "go"}
        onSubmitEditing={canManageOrg ? () => orgRef.current?.focus() : onSave}
        blurOnSubmit={!canManageOrg}
      />
      <Text style={styles.hint}>Changing your email or phone will ask you to verify a phone number first.</Text>

      {canManageOrg && (
        <FormField
          ref={orgRef}
          label="Organization name"
          value={organizationName}
          onChangeText={setOrganizationName}
          placeholder="Blue Trout Farm"
          returnKeyType="go"
          onSubmitEditing={onSave}
        />
      )}

      <PrimaryButton title="Save" onPress={onSave} loading={loading} style={styles.saveButton} />

      <TouchableOpacity onPress={() => navigation.navigate("ChangePassword")}>
        <Text style={styles.changePasswordLink}>Change password</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  hint: { fontSize: 12, color: colors.inkMuted, marginTop: -6, marginBottom: 16, lineHeight: 17 },
  saveButton: { marginTop: 4 },
  changePasswordLink: { textAlign: "center", color: colors.teal, fontSize: 13, fontWeight: "700", marginTop: 20 },
});
