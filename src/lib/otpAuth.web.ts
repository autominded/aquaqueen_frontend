import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { fetchPublicConfig } from "../api/publicConfig";

// @react-native-firebase/auth (used on native — see otpAuth.native.ts) has no
// web implementation at all, so web signs in via the standard Firebase JS
// SDK instead, against the same Firebase project. The server's
// verifyFirebasePhoneToken doesn't care which SDK issued the ID token, so no
// server-side change is needed for this to work end to end.
let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;
let appInitialized = false;

async function ensureFirebaseApp() {
  if (appInitialized) return;
  const { firebase } = await fetchPublicConfig();
  if (!firebase.apiKey || !firebase.authDomain || !firebase.projectId || !firebase.appId) {
    throw new Error("Firebase is not configured yet — ask a super admin to add Firebase credentials in Admin > Settings.");
  }
  if (getApps().length === 0) {
    initializeApp({
      apiKey: firebase.apiKey,
      authDomain: firebase.authDomain,
      projectId: firebase.projectId,
      storageBucket: firebase.storageBucket ?? undefined,
      messagingSenderId: firebase.messagingSenderId ?? undefined,
      appId: firebase.appId,
    });
  }
  appInitialized = true;
}

// Google's own reCAPTCHA badge (a separate `.grecaptcha-badge` element it
// injects into the page, not something rendered inside our container) is
// `position: fixed; bottom: 14px; right: 14px` by default with a very high
// z-index — that's the same bottom-right corner AppTabs' fixed 68px-tall tab
// bar occupies, so the badge sits directly on top of the "More" tab once
// startVerification() has run. Repositioning it (not hiding it — hiding
// without showing the required reCAPTCHA branding elsewhere violates
// Google's terms) keeps it above the tab bar instead.
function ensureRecaptchaBadgeRepositioned() {
  if (document.getElementById("recaptcha-badge-position-fix")) return;
  const style = document.createElement("style");
  style.id = "recaptcha-badge-position-fix";
  style.textContent = ".grecaptcha-badge { bottom: 82px !important; }";
  document.head.appendChild(style);
}

// Invisible reCAPTCHA needs a real container element in the DOM — created
// lazily here rather than requiring every screen that might trigger a phone
// sign-in to render one.
function getRecaptchaVerifier(auth: ReturnType<typeof getAuth>) {
  if (recaptchaVerifier) return recaptchaVerifier;
  ensureRecaptchaBadgeRepositioned();
  const container = document.createElement("div");
  container.id = "recaptcha-container";
  document.body.appendChild(container);
  recaptchaVerifier = new RecaptchaVerifier(auth, container, { size: "invisible" });
  return recaptchaVerifier;
}

export async function startVerification(phone: string): Promise<void> {
  await ensureFirebaseApp();
  const auth = getAuth();
  const verifier = getRecaptchaVerifier(auth);
  confirmationResult = await signInWithPhoneNumber(auth, phone, verifier);
}

export async function confirmCode(code: string): Promise<string> {
  if (!confirmationResult) {
    throw new Error("No pending phone verification — start over from the signup form.");
  }
  const credential = await confirmationResult.confirm(code);
  const idToken = await credential.user.getIdToken();
  confirmationResult = null;
  return idToken;
}

export function cancelVerification(): void {
  confirmationResult = null;
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
}
