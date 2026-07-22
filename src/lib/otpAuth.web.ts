// @react-native-firebase/auth has no web implementation at all — this stub
// keeps the web bundle healthy (Metro resolves this file instead of
// otpAuth.native.ts for the web target) while making the limitation explicit
// rather than silently failing.
const WEB_UNSUPPORTED_MESSAGE = "Phone verification requires the mobile app — please sign up from a phone or tablet.";

export async function startVerification(_phone: string): Promise<void> {
  throw new Error(WEB_UNSUPPORTED_MESSAGE);
}

export async function confirmCode(_code: string): Promise<string> {
  throw new Error(WEB_UNSUPPORTED_MESSAGE);
}

export function cancelVerification(): void {
  // no-op on web — there's never a pending confirmation to clear
}
