import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
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
    backgroundColor: "#fdecea",
    borderRadius: 8,
    padding: 16,
    margin: 16,
    alignItems: "center",
  },
  text: { color: "#7a2019", marginBottom: 8, textAlign: "center" },
  button: { backgroundColor: "#7a2019", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  buttonText: { color: "white", fontWeight: "600" },
});
