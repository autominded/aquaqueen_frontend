import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthStackParamList } from "./types";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { SignupScreen } from "../screens/auth/SignupScreen";
import { VerifyOtpScreen } from "../screens/auth/VerifyOtpScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { ResetPasswordOtpScreen } from "../screens/auth/ResetPasswordOtpScreen";
import { stackScreenOptions } from "../theme";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ ...stackScreenOptions, headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ headerShown: true, title: "Verify phone" }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: true, title: "Forgot password" }} />
      <Stack.Screen name="ResetPasswordOtp" component={ResetPasswordOtpScreen} options={{ headerShown: true, title: "Verify phone" }} />
    </Stack.Navigator>
  );
}
