import { Alert, Platform } from "react-native";

// RN Web's Alert.alert is a complete no-op (react-native-web ships
// `static alert() {}`), so any single-button confirmation/error dialog
// gated behind it silently vanishes on web — window.alert is the web
// equivalent, same convention as confirmAction in confirm.ts.
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
