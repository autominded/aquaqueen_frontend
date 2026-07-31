import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./src/context/AuthContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { initSentry } from "./src/lib/sentry";
import { UnitsProvider } from "./src/context/UnitsContext";

initSentry();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <UnitsProvider><AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider></UnitsProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
