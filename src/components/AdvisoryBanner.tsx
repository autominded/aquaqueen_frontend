import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dismissAdvisory, fetchActiveAdvisories } from "../api/advisories";
import { Advisory, AdvisorySeverity } from "../api/types";
import { AppIcon } from "./AppIcon";
import { colors, radii } from "../theme";

const SEVERITY_STYLE: Record<AdvisorySeverity, { bg: string; fg: string; icon: React.ComponentProps<typeof AppIcon>["name"] }> = {
  CRITICAL: { bg: colors.coralSoft, fg: colors.coral, icon: "alert-triangle" },
  WARNING: { bg: colors.amberSoft, fg: colors.amber, icon: "alert-circle" },
  INFO: { bg: colors.tealSoft, fg: colors.teal, icon: "info" },
};

// Polled rather than pushed — see useAdvisoryPoll, which runs this same
// query at the tab-navigator level so new advisories surface (banner here,
// tab badge everywhere else) without the user having to pull to refresh.
export function AdvisoryBanner() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["advisories"], queryFn: fetchActiveAdvisories, refetchInterval: 60000 });
  const dismissMutation = useMutation({
    mutationFn: (id: string) => dismissAdvisory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["advisories"] }),
  });

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.container}>
      {data.map((advisory) => (
        <AdvisoryCard key={advisory.id} advisory={advisory} onDismiss={() => dismissMutation.mutate(advisory.id)} />
      ))}
    </View>
  );
}

function AdvisoryCard({ advisory, onDismiss }: { advisory: Advisory; onDismiss: () => void }) {
  const style = SEVERITY_STYLE[advisory.severity];
  return (
    <View style={[styles.card, { backgroundColor: style.bg }]}>
      <AppIcon name={style.icon} size={18} color={style.fg} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: style.fg }]}>{advisory.title}</Text>
        <Text style={styles.body}>{advisory.body}</Text>
      </View>
      <TouchableOpacity accessibilityLabel="Dismiss advisory" onPress={onDismiss} hitSlop={8}>
        <AppIcon name="x" size={18} color={style.fg} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: radii.md, padding: 14 },
  copy: { flex: 1 },
  title: { fontSize: 13, fontWeight: "800" },
  body: { fontSize: 12, color: colors.inkMuted, marginTop: 3, lineHeight: 17 },
});
