import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BatchesStackParamList } from "../../navigation/types";
import { completeCleaningTask, createCleaningTask, fetchCleaningTasks, toggleCleaningChecklistItem } from "../../api/tasks";
import { fetchTeam } from "../../api/users";
import { fetchFarm } from "../../api/farm";
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
import { AppIcon } from "../../components/AppIcon";
import { apiErrorMessage } from "../../api/client";
import { colors } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<BatchesStackParamList, "CleaningTasks">;

const RECURRENCE_OPTIONS: RecurrenceType[] = ["NONE", "DAILY", "WEEKLY", "MONTHLY"];

export function CleaningTasksScreen(_props: Props) {
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({ queryKey: ["cleaning-tasks"], queryFn: fetchCleaningTasks });
  const teamQuery = useQuery({ queryKey: ["team"], queryFn: fetchTeam });
  const farmQuery = useQuery({ queryKey: ["farm"], queryFn: fetchFarm });

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [racewayId, setRacewayId] = useState<string | undefined>(undefined);
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [recurrence, setRecurrence] = useState<RecurrenceType>("NONE");
  const [assignedToId, setAssignedToId] = useState<string | undefined>(undefined);
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [checklistDraft, setChecklistDraft] = useState("");

  const resetForm = () => {
    setAdding(false);
    setTitle("");
    setNotes("");
    setRacewayId(undefined);
    setDueDate(new Date().toISOString().slice(0, 10));
    setRecurrence("NONE");
    setAssignedToId(undefined);
    setChecklistItems([]);
    setChecklistDraft("");
  };

  const addChecklistItem = () => {
    if (!checklistDraft.trim()) return;
    setChecklistItems((items) => [...items, checklistDraft.trim()]);
    setChecklistDraft("");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createCleaningTask({ title: title.trim(), racewayId, dueDate, recurrence, assignedToId, notes: notes.trim() || undefined, checklistItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cleaning-tasks"] });
      resetForm();
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => completeCleaningTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cleaning-tasks"] }),
  });

  const toggleItemMutation = useMutation({
    mutationFn: ({ taskId, itemId, done }: { taskId: string; itemId: string; done: boolean }) => toggleCleaningChecklistItem(taskId, itemId, done),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cleaning-tasks"] }),
  });

  const canSubmit = title.trim().length > 0 && dueDate.length > 0;
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
                <FormField label="Title" value={title} onChangeText={setTitle} placeholder="Weekly raceway scrub-down" />
                <SelectField label="Raceway (optional)" value={racewayId} onSelect={setRacewayId} placeholder="Whole farm" options={racewayOptions} />
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
                <FormField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any extra detail" multiline />

                <Text style={styles.chipLabel}>Checklist</Text>
                {checklistItems.map((item, i) => (
                  <View key={i} style={styles.checklistDraftRow}>
                    <Text style={styles.checklistDraftText}>{item}</Text>
                    <TouchableOpacity onPress={() => setChecklistItems((items) => items.filter((_, idx) => idx !== i))} accessibilityLabel="Remove checklist item">
                      <AppIcon name="x" size={16} color={colors.inkMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.checklistAddRow}>
                  <FormField
                    label=""
                    value={checklistDraft}
                    onChangeText={setChecklistDraft}
                    placeholder="e.g. Scrub tank walls"
                    onSubmitEditing={addChecklistItem}
                    style={styles.checklistInput}
                  />
                  <PrimaryButton title="+" onPress={addChecklistItem} disabled={!checklistDraft.trim()} style={styles.checklistAddButton} />
                </View>

                <View style={styles.addActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={resetForm} style={styles.addButton} />
                  <PrimaryButton title="Add cleaning task" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} style={styles.addButton} />
                </View>
              </Card>
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.addLink}>+ Add cleaning task</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? <LoadingView /> : <EmptyState title="No cleaning tasks yet" subtitle="Add a task above to start tracking farm cleaning." />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.title}</Text>
              <StatusPill label={item.status} tone={item.status === "DONE" ? "success" : "warning"} />
            </View>
            <Text style={styles.meta}>
              {item.raceway ? item.raceway.name : "Whole farm"} · Due {item.dueDate.slice(0, 10)}
              {item.recurrence !== "NONE" ? ` · repeats ${item.recurrence.toLowerCase()}` : ""}
              {item.assignedTo ? ` · ${item.assignedTo.name}` : ""}
            </Text>
            {item.notes && <Text style={styles.meta}>{item.notes}</Text>}
            {item.checklistItems.length > 0 && (
              <View style={styles.checklist}>
                {item.checklistItems.map((ci) => (
                  <TouchableOpacity
                    key={ci.id}
                    style={styles.checklistRow}
                    onPress={() => toggleItemMutation.mutate({ taskId: item.id, itemId: ci.id, done: !ci.done })}
                  >
                    <AppIcon name={ci.done ? "check-square" : "square"} size={16} color={ci.done ? colors.teal : colors.inkMuted} />
                    <Text style={[styles.checklistText, ci.done && styles.checklistTextDone]}>{ci.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
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
  checklistDraftRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  checklistDraftText: { fontSize: 13, color: colors.ink, flexShrink: 1 },
  checklistAddRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 16 },
  checklistInput: { flex: 1, marginBottom: 0 },
  checklistAddButton: { flexGrow: 0, minWidth: 44 },
  card: {},
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "800", color: colors.ink, flexShrink: 1 },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 4 },
  checklist: { marginTop: 10, gap: 2 },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  checklistText: { fontSize: 13, color: colors.ink },
  checklistTextDone: { color: colors.inkMuted, textDecorationLine: "line-through" },
  completeButton: { marginTop: 10, alignSelf: "flex-start" },
});
