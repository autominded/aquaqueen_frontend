import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createAdvisory, fetchAllAdvisories } from "../../api/advisories";
import { AdvisorySeverity, AdvisoryType } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { StatusPill } from "../../components/StatusPill";
import { apiErrorMessage } from "../../api/client";
import { colors } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

const SEVERITY_OPTIONS: { value: AdvisorySeverity; label: string }[] = [
  { value: "INFO", label: "Info" },
  { value: "WARNING", label: "Warning" },
  { value: "CRITICAL", label: "Critical" },
];

const TYPE_OPTIONS: { value: AdvisoryType; label: string }[] = [
  { value: "WEATHER", label: "Weather" },
  { value: "TEMPERATURE", label: "Temperature" },
  { value: "NEWS", label: "News" },
  { value: "GENERAL", label: "General" },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AdminAdvisoriesScreen() {
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["admin-advisories"],
    queryFn: fetchAllAdvisories,
  });

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<AdvisorySeverity | undefined>(undefined);
  const [type, setType] = useState<AdvisoryType | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: () => createAdvisory({ title: title.trim(), body: body.trim(), severity: severity!, type: type! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-advisories"] });
      setAdding(false);
      setTitle("");
      setBody("");
      setSeverity(undefined);
      setType(undefined);
    },
  });

  const canSubmit = title.trim() && body.trim() && severity && type;

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.addSection}>
            {isError && <ErrorBanner message={apiErrorMessage(error)} onRetry={refetch} />}
            {createMutation.isError && <ErrorBanner message={apiErrorMessage(createMutation.error)} />}
            {adding ? (
              <Card style={styles.addCard}>
                <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Cold front warning" />
                <FormField label="Message" value={body} onChangeText={setBody} placeholder="A cold front is expected tonight; check heaters." multiline />
                <SelectField label="Severity" value={severity ?? null} onSelect={(v) => setSeverity(v as AdvisorySeverity)} options={SEVERITY_OPTIONS} placeholder="Select severity" />
                <SelectField label="Type" value={type ?? null} onSelect={(v) => setType(v as AdvisoryType)} options={TYPE_OPTIONS} placeholder="Select type" />
                <View style={styles.addActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={styles.addButton} />
                  <PrimaryButton title="Push to all users" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} style={styles.addButton} />
                </View>
              </Card>
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.addLink}>+ New advisory</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? <LoadingView /> : <EmptyState title="No advisories yet" subtitle="Push one above to reach every user across every farm." />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.title}</Text>
              <StatusPill
                label={item.severity}
                tone={item.severity === "CRITICAL" ? "critical" : item.severity === "WARNING" ? "warning" : "neutral"}
              />
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.meta}>{item.type} · {formatDateTime(item.createdAt)} · {item._count.dismissals} dismissed</Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  listContent: { paddingVertical: 16 },
  addSection: { paddingHorizontal: 16, marginBottom: 4 },
  addLink: { fontSize: 13, fontWeight: "700", color: colors.teal, marginBottom: 12 },
  addCard: { marginHorizontal: 0, marginBottom: 12 },
  addActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  addButton: { flex: 1 },
  card: {},
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink, flex: 1 },
  body: { fontSize: 13, color: colors.inkMuted, marginTop: 6, lineHeight: 18 },
  meta: { fontSize: 11, color: colors.inkMuted, marginTop: 8 },
});
