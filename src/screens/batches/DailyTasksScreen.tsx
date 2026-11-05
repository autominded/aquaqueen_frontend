import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { completeDailyTask, createDailyTask, fetchDailyTasks, reopenDailyTask } from "../../api/tasks";
import { fetchTeam } from "../../api/users";
import { RecurrenceType } from "../../api/types";
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

type Props = NativeStackScreenProps<BatchesStackParamList, "DailyTasks">;

const RECURRENCE_OPTIONS: RecurrenceType[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

export function DailyTasksScreen(_props: Props) {
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["daily-tasks"], queryFn: fetchDailyTasks });
  const teamQuery = useQuery({ queryKey: ["team"], queryFn: fetchTeam });

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [recurrence, setRecurrence] = useState<RecurrenceType>("DAILY");
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);

  const resetForm = () => {
    setAdding(false);
    setTitle("");
    setNotes("");
    setDueDate(new Date().toISOString().slice(0, 10));
    setRecurrence("DAILY");
    setAssignedToId(undefined);
  };

  const createMutation = useMutation({
    mutationFn: () => createDailyTask({ title: title.trim(), notes: notes.trim() || undefined, dueDate, recurrence, assignedToId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-tasks"] });
      resetForm();
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeDailyTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily-tasks"] }),
  });

  const reopenMutation = useMutation({
    mutationFn: (id: string) => reopenDailyTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["daily-tasks"] }),
  });

  const canSubmit = title.trim().length > 0 && dueDate.length > 0;

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
                <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Check aerators" />
                <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any extra detail" multiline />
                <DateField label="Due date" value={dueDate} onChange={setDueDate} />
                <Text style={styles.chipLabel}>Repeats</Text>
                <View style={styles.chipRow}>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <PrimaryButton key={r} title={r === "NONE" ? "One-off" : r.charAt(0) + r.slice(1).toLowerCase()} variant={recurrence === r ? "primary" : "secondary"} onPress={() => setRecurrence(r)} style={styles.chip} />
                  ))}
                </View>
                <SelectField
                  label="Assign to (optional)"
                  value={assignedToId}
                  onSelect={setAssignedToId}
                  placeholder="Unassigned"
                  options={(teamQuery.data ?? []).map((u) => ({ label: u.name, value: u.id }))}
                />
                <View style={styles.addActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={resetForm} style={styles.addButton} />
                  <PrimaryButton title="Add task" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} style={styles.addButton} />
                </View>
              </Card>
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.addLink}>+ Add daily task</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? <LoadingView /> : <EmptyState title="No daily tasks yet" subtitle="Add a task above to start tracking day-to-day work." />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.title}</Text>
              <StatusPill label={item.status} tone={item.status === "DONE" ? "success" : "warning"} />
            </View>
            {item.notes && <Text style={styles.meta}>{item.notes}</Text>}
            <Text style={styles.meta}>
              Due {item.dueDate.slice(0, 10)}
              {item.recurrence !== "NONE" ? ` · repeats ${item.recurrence.toLowerCase()}` : ""}
              {item.assignedTo ? ` · ${item.assignedTo.name}` : ""}
            </Text>
            {item.status !== "DONE" ? (
              <PrimaryButton title="Mark done" variant="secondary" onPress={() => completeMutation.mutate(item.id)} loading={completeMutation.isPending} style={styles.completeButton} />
            ) : (
              <PrimaryButton title="Reopen" variant="ghost" onPress={() => reopenMutation.mutate(item.id)} loading={reopenMutation.isPending} style={styles.completeButton} />
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
