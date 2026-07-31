import React, { Suspense, lazy } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { LoadingView } from "../components/LoadingView";

// Lazy-loaded so a logged-out visitor (the Login screen) only downloads the
// small AuthStack chunk, not the entire app — AppTabs pulls in every domain
// (batches, hatchery, POS, purchases, admin, marketplace...), and until this
// split, all of it shipped in one bundle regardless of which one a given
// visitor actually needed. Requires '@expo/metro-runtime' imported in
// index.ts (see there) — without it, `expo export --platform web` doesn't
// split on these async imports at all, and native builds still bundle
// everything up front, which is fine since there's no separate download to
// avoid there.
const AuthStack = lazy(() => import("./AuthStack").then((m) => ({ default: m.AuthStack })));
const AppTabs = lazy(() => import("./AppTabs").then((m) => ({ default: m.AppTabs })));

// Without a `linking` prop at all, NavigationContainer never touches
// window.history on web — every in-app navigation is invisible to the
// browser, so its back button has nothing to step through except real page
// loads and jumps straight to whatever URL was last actually loaded.
// Passing `linking` (even with no explicit path `config`) turns on
// NavigationContainer's default history integration, which pushes a history
// entry per navigation action and wires the browser back/forward buttons to
// `navigation.goBack()`/state restoration.
const linking = { prefixes: [] };

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingView />;

  return (
    <NavigationContainer linking={linking}>
      <Suspense fallback={<LoadingView />}>{user ? <AppTabs /> : <AuthStack />}</Suspense>
    </NavigationContainer>
  );
}
