import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppIcon } from "./AppIcon";
import { colors, radii } from "../theme";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.container}>
      <AppIcon name="alert-circle" size={18} color={colors.coral} /><Text style={styles.text}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.button}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.coralSoft, borderRadius: radii.md, padding: 14,
    margin: 16,
    alignItems: "center", flexDirection: "row", gap: 8,
  },
  text: { color: colors.coral, textAlign: "left", flex: 1, fontSize: 13, lineHeight: 18 },
  button: { backgroundColor: colors.coral, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.sm },
  buttonText: { color: colors.white, fontWeight: "800", fontSize: 12 },
});
