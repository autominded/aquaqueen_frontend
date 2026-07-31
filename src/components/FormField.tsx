import React, { forwardRef } from "react";
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { colors, radii } from "../theme";

interface Props extends Omit<TextInputProps, "style"> {
  label: string;
  error?: string;
  // Affects the field's outer container (layout: flex, margins) — the
  // handful of callers passing this always mean row-sharing or spacing,
  // never TextInput text styling.
  style?: StyleProp<ViewStyle>;
}

export const FormField = forwardRef<TextInput, Props>(function FormField({ label, error, style, ...rest }, ref) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput ref={ref} style={[styles.input, error ? styles.inputError : null]} placeholderTextColor="#9aa5a5" {...rest} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    minHeight: 50,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.coral },
  error: { color: colors.coral, fontSize: 12, marginTop: 4 },
});
