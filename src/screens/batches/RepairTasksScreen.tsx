import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { completeRepairTask, createRepairTask, fetchRepairTasks } from "../../api/tasks";
import { fetchTeam } from "../../api/users";
import { fetchFarm } from "../../api/farm";
import { RepairPriority } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { DateField } from "../../components/DateField";
import { StatusPill } from "../../components/StatusPill";
import { apiErrorMessage } from "../../api/client";
import { colors } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<BatchesStackParamList, "RepairTasks">;

const PRIORITY_OPTIONS: RepairPriority[] = ["LOW", "NORMAL", "URGENT"];

function priorityTone(priority: RepairPriority): "neutral" | "warning" | "critical" {
  if (priority === "URGENT") return "critical";
  if (priority === "NORMAL") return "warning";
  return "neutral";
}

export function RepairTasksScreen(_props: Props) {
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["repair-tasks"], queryFn: fetchRepairTasks });
  const teamQuery = useQuery({ queryKey: ["team"], queryFn: fetchTeam });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [racewayId, setRacewayId] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<RepairPriority>("NORMAL");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);

  const resetForm = () => {
    setAdding(false);
    setTitle("");
    setDescription("");
    setRacewayId(undefined);
    setPriority("NORMAL");
    setDueDate("");
    setAssignedToId(undefined);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createRepairTask({ title: title.trim(), description: description.trim() || undefined, racewayId, priority, dueDate: dueDate || undefined, assignedToId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repair-tasks"] });
      resetForm();
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeRepairTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["repair-tasks"] }),
  });

  const canSubmit = title.trim().length > 0;
  const racewayOptions = (farmQuery.data?.raceways ?? []).map((r) => ({ label: r.name, value: r.id }));

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
                <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Aerator #2 not turning on" />
                <FormField label="Description (optional)" value={description} onChangeText={setDescription} placeholder="Any extra detail" multiline />
                <SelectField label="Raceway (optional)" value={racewayId} onSelect={setRacewayId} placeholder="Whole farm" options={racewayOptions} />
                <Text style={styles.chipLabel}>Priority</Text>
                <View style={styles.chipRow}>
                  {PRIORITY_OPTIONS.map((p) => (
                    <PrimaryButton key={p} title={p.charAt(0) + p.slice(1).toLowerCase()} variant={priority === p ? "primary" : "secondary"} onPress={() => setPriority(p)} style={styles.chip} />
                  ))}
                </View>
                <DateField label="Due date (optional)" value={dueDate} onChange={setDueDate} />
                <SelectField
                  label="Assign to (optional)"
                  value={assignedToId}
                  onSelect={setAssignedToId}
                  placeholder="Unassigned"
                  options={(teamQuery.data ?? []).map((u) => ({ label: u.name, value: u.id }))}
                />
                <View style={styles.addActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={resetForm} style={styles.addButton} />
                  <PrimaryButton title="Add repair" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} style={styles.addButton} />
                </View>
              </Card>
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.addLink}>+ Add repair</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? <LoadingView /> : <EmptyState title="No repair tasks yet" subtitle="Add one above to start tracking repair work." />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.title}</Text>
              <StatusPill label={item.status} tone={item.status === "DONE" ? "success" : priorityTone(item.priority)} />
            </View>
            <Text style={styles.meta}>
              {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()} priority
              {item.raceway ? ` · ${item.raceway.name}` : ""}
              {item.dueDate ? ` · Due ${item.dueDate.slice(0, 10)}` : ""}
              {item.assignedTo ? ` · ${item.assignedTo.name}` : ""}
            </Text>
            {item.description && <Text style={styles.meta}>{item.description}</Text>}
            {item.status !== "DONE" && (
              <PrimaryButton title="Mark done" variant="secondary" onPress={() => completeMutation.mutate(item.id)} loading={completeMutation.isPending} style={styles.completeButton} />
            )}
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
  chipLabel: { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { flexGrow: 0 },
  card: {},
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink, flexShrink: 1 },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  completeButton: { marginTop: 10, alignSelf: "flex-start" },
});
