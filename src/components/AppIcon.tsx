import React from "react";
import { Feather } from "@expo/vector-icons";
import { colors } from "../theme";

type IconName = React.ComponentProps<typeof Feather>["name"];

export function AppIcon({ name, size = 20, color = colors.inkMuted }: { name: IconName; size?: number; color?: string }) {
  return <Feather name={name} size={size} color={color} />;
}
