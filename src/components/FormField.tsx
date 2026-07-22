import React from "react";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function FormField({ label, error, style, ...rest }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, error ? styles.inputError : null, style]} placeholderTextColor="#9aa5a5" {...rest} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#3f4a4a", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d7dede",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#1c2424",
    backgroundColor: "white",
  },
  inputError: { borderColor: "#c0392b" },
  error: { color: "#c0392b", fontSize: 12, marginTop: 4 },
});
