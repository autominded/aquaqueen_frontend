export const colors = {
  ink: "#17212B",
  inkMuted: "#62727A",
  ocean: "#073B4C",
  teal: "#0F766E",
  tealDark: "#0B5E59",
  tealSoft: "#DDF4EE",
  canvas: "#F7F6F2",
  surface: "#FFFFFF",
  border: "#E4E8E5",
  coral: "#D95D47",
  coralSoft: "#FCE8E4",
  amber: "#A65E00",
  amberSoft: "#FFF2D6",
  success: "#18794E",
  successSoft: "#E3F5EA",
  white: "#FFFFFF",
} as const;

export const radii = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const shadows = {
  card: {
    shadowColor: "#17212B",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
} as const;

export const stackScreenOptions = {
  headerTintColor: colors.ocean,
  headerTitleStyle: { color: colors.ocean, fontWeight: "800" as const },
  headerStyle: { backgroundColor: colors.canvas },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.canvas },
} as const;
