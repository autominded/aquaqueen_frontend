import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { colors, radii } from "../theme";

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
}

export function PrimaryButton({ title, onPress, loading, disabled, variant = "primary", style }: Props) {
  const isSecondary = variant === "secondary";
  const isGhost = variant === "ghost";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        isSecondary ? styles.secondary : isGhost ? styles.ghost : styles.primary,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary || isGhost ? colors.teal : colors.white} />
      ) : (
        <Text style={isSecondary || isGhost ? styles.secondaryText : styles.primaryText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.teal },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.teal },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.6 },
  primaryText: { color: colors.white, fontWeight: "800", fontSize: 15 },
  secondaryText: { color: colors.teal, fontWeight: "800", fontSize: 15 },
});
