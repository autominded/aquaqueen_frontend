import { Alert, Platform } from "react-native";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

// RN Web's Alert.alert doesn't render multi-button dialogs at all — a
// Cancel/Confirm pair silently no-ops there, so any flow gated behind it
// (impersonate, delete) never runs. window.confirm is the web equivalent.
export function confirmAction(options: ConfirmOptions, onConfirm: () => void) {
  const { title, message, confirmLabel = "Confirm", destructive = false } = options;

  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}
