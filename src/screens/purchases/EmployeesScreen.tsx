import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { createEmployee, fetchEmployees } from "../../api/employees";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { EmptyState } from "../../components/EmptyState";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusPill } from "../../components/StatusPill";
import { apiErrorMessage } from "../../api/client";
import { colors } from "../../theme";
import { useRefreshing } from "../../lib/useRefreshing";

type Props = NativeStackScreenProps<PurchasesStackParamList, "Employees">;

export function EmployeesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = useRefreshing();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [joinDate, setJoinDate] = useState(new Date().toISOString().slice(0, 10));

  const createMutation = useMutation({
    mutationFn: () =>
      createEmployee({
        name: name.trim(),
        designation: designation.trim() || undefined,
        phone: phone.trim() && phone.trim() !== "+91" ? phone.trim() : undefined,
        monthlySalary: Number(monthlySalary) > 0 ? Number(monthlySalary) : undefined,
        joinDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setAdding(false);
      setName("");
      setDesignation("");
      setPhone("+91 ");
      setMonthlySalary("");
    },
  });

  const canSubmit = name.trim() && joinDate;

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
                <FormField label="Name" value={name} onChangeText={setName} placeholder="Bilal Ahmad" />
                <FormField label="Designation (optional)" value={designation} onChangeText={setDesignation} placeholder="Farm Hand" />
                <FormField label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
                <FormField label="Monthly salary (optional)" value={monthlySalary} onChangeText={setMonthlySalary} keyboardType="numeric" placeholder="18000" />
                <DateField label="Join date" value={joinDate} onChange={setJoinDate} />
                <View style={styles.addActions}>
                  <PrimaryButton title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={styles.addButton} />
                  <PrimaryButton title="Add employee" onPress={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} style={styles.addButton} />
                </View>
              </Card>
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)}>
                <Text style={styles.addLink}>+ Add employee</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          isPending ? <LoadingView /> : <EmptyState title="No employees yet" subtitle="Add an employee above to start tracking salary, expenses and leaves." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate("EmployeeDetail", { employeeId: item.id })}>
            <Card style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.designation && <Text style={styles.meta}>{item.designation}</Text>}
                </View>
                <StatusPill label={item.status} tone={item.status === "ACTIVE" ? "success" : "neutral"} />
              </View>
              {item.monthlySalary != null && <Text style={styles.salary}>₹{item.monthlySalary.toLocaleString()}/mo</Text>}
            </Card>
          </TouchableOpacity>
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
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "800", color: colors.ink },
  meta: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  salary: { fontSize: 13, fontWeight: "700", color: colors.tealDark, marginTop: 8 },
});
