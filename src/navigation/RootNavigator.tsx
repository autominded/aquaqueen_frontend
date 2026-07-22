import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { AuthStack } from "./AuthStack";
import { AppTabs } from "./AppTabs";
import { LoadingView } from "../components/LoadingView";

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingView />;

  return <NavigationContainer>{user ? <AppTabs /> : <AuthStack />}</NavigationContainer>;
}
