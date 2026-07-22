import { getAuth, signInWithPhoneNumber } from "@react-native-firebase/auth";

// Firebase's confirmation object carries a live `.confirm()` method — it
// can't be serialized through navigation params, so it's held here in a
// module-level variable instead (see VerifyOtpScreen.tsx). Typed via
// inference since the modular ConfirmationResult type isn't re-exported by
// name from the package's public entry point.
let pendingConfirmation: Awaited<ReturnType<typeof signInWithPhoneNumber>> | null = null;

export async function startVerification(phone: string): Promise<void> {
  const auth = getAuth();
  pendingConfirmation = await signInWithPhoneNumber(auth, phone);
}

export async function confirmCode(code: string): Promise<string> {
  if (!pendingConfirmation) {
    throw new Error("No pending phone verification — start over from the signup form.");
  }
  const credential = await pendingConfirmation.confirm(code);
  const idToken = await credential.user.getIdToken();
  pendingConfirmation = null;
  return idToken;
}

export function cancelVerification(): void {
  pendingConfirmation = null;
}
