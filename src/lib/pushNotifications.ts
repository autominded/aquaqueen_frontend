import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { registerPushToken } from "../api/advisories";

// Best-effort: no web support in expo-notifications at all, and no EAS
// projectId configured yet either — either of those (or a user declining
// the permission prompt) should silently skip, never block app usage.
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web" || !Device.isDevice) return;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
  } catch {
    // No projectId, no permission, or the device doesn't support push —
    // the Advisory still shows on the dashboard card either way.
  }
}
