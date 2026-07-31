import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PurchasesStackParamList } from "../../navigation/types";
import { createEmployeeExpense, createLeaveRecord, createSalaryPayment, fetchEmployee } from "../../api/employees";
import { fetchAccounts } from "../../api/accounts";
import { LeaveType } from "../../api/types";
import { LoadingView } from "../../components/LoadingView";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Card } from "../../components/Card";
import { FormField } from "../../components/FormField";
import { DateField } from "../../components/DateField";
import { PrimaryButton } from "../../components/PrimaryButton";
import { SelectField } from "../../components/SelectField";
import { apiErrorMessage } from "../../api/client";
import { useRefreshing } from "../../lib/useRefreshing";
import { RefreshableScrollView } from "../../components/RefreshableScrollView";
import { colors, radii } from "../../theme";

type Props = NativeStackScreenProps<PurchasesStackParamList, "EmployeeDetail">;

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: "CASUAL", label: "Casual" },
  { value: "SICK", label: "Sick" },
  { value: "EARNED", label: "Earned" },
  { value: "UNPAID", label: "Unpaid" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function EmployeeDetailScreen({ route }: Props) {
  const { employeeId } = route.params;
  const queryClient = useQueryClient();
  const detailQuery = useQuery({ queryKey: ["employee", employeeId], queryFn: () => fetchEmployee(employeeId) });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: fetchAccounts });
  const accounts = accountsQuery.data ?? [];
  const { refreshing, onRefresh } = useRefreshing();

  const [salaryAccountId, setSalaryAccountId] = useState<string | undefined>(undefined);
  const [salaryAmount, setSalaryAmount] = useState("");
  const [periodMonth, setPeriodMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryDate, setSalaryDate] = useState(new Date().toISOString().slice(0, 10));

  const [expenseAccountId, setExpenseAccountId] = useState<string | undefined>(undefined);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  const [leaveType, setLeaveType] = useState<LeaveType>("CASUAL");
  const [leaveStart, setLeaveStart] = useState(new Date().toISOString().slice(0, 10));
  const [leaveEnd, setLeaveEnd] = useState(new Date().toISOString().slice(0, 10));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    queryClient.invalidateQueries({ queryKey: ["ledger"] });
  };

  const salaryMutation = useMutation({
    mutationFn: () =>
      createSalaryPayment(employeeId, { accountId: salaryAccountId!, amount: Number(salaryAmount), periodMonth, date: salaryDate }),
    onSuccess: () => {
      setSalaryAmount("");
      invalidate();
    },
  });

  const expenseMutation = useMutation({
    mutationFn: () =>
      createEmployeeExpense(employeeId, {
        accountId: expenseAccountId!,
        amount: Number(expenseAmount),
        description: expenseDescription.trim(),
        date: expenseDate,
      }),
    onSuccess: () => {
      setExpenseAmount("");
      setExpenseDescription("");
      invalidate();
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => createLeaveRecord(employeeId, { type: leaveType, startDate: leaveStart, endDate: leaveEnd }),
    onSuccess: invalidate,
  });

  if (detailQuery.isPending) return <LoadingView />;
  if (detailQuery.isError) return <ErrorBanner message={apiErrorMessage(detailQuery.error)} onRetry={detailQuery.refetch} />;

  const { employee, salaryPayments, expenses, leaveRecords } = detailQuery.data;

  return (
    <RefreshableScrollView contentContainerStyle={styles.container} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.hero}>
        <Text style={styles.title}>{employee.name}</Text>
        {employee.designation && <Text style={styles.dims}>{employee.designation}</Text>}
        {employee.monthlySalary != null && <Text style={styles.dims}>₹{employee.monthlySalary.toLocaleString()}/mo · joined {formatDate(employee.joinDate)}</Text>}
      </View>

      <Text style={styles.sectionTitle}>Salary payments</Text>
      <Card style={styles.formCard}>
        {salaryMutation.isError && <ErrorBanner message={apiErrorMessage(salaryMutation.error)} />}
        <SelectField label="Paid from" value={salaryAccountId ?? null} onSelect={setSalaryAccountId} placeholder="Select account" options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
        <View style={styles.row}>
          <FormField label="Amount" value={salaryAmount} onChangeText={setSalaryAmount} keyboardType="numeric" placeholder="18000" style={styles.rowField} />
          <FormField label="Period (YYYY-MM)" value={periodMonth} onChangeText={setPeriodMonth} style={styles.rowField} />
        </View>
        <DateField label="Date" value={salaryDate} onChange={setSalaryDate} />
        <PrimaryButton
          title="Pay salary"
          variant="secondary"
          onPress={() => salaryMutation.mutate()}
          loading={salaryMutation.isPending}
          disabled={!(salaryAccountId && Number(salaryAmount) > 0 && periodMonth && salaryDate)}
        />
      </Card>
      {salaryPayments.map((p) => (
        <View key={p.id} style={styles.logRow}>
          <Text style={styles.logMeta}>{p.periodMonth} · {formatDate(p.date)}</Text>
          <Text style={styles.logValue}>₹{p.amount.toFixed(2)}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Expenses</Text>
      <Card style={styles.formCard}>
        {expenseMutation.isError && <ErrorBanner message={apiErrorMessage(expenseMutation.error)} />}
        <SelectField label="Paid from" value={expenseAccountId ?? null} onSelect={setExpenseAccountId} placeholder="Select account" options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
        <FormField label="Description" value={expenseDescription} onChangeText={setExpenseDescription} placeholder="Travel reimbursement" />
        <View style={styles.row}>
          <FormField label="Amount" value={expenseAmount} onChangeText={setExpenseAmount} keyboardType="numeric" placeholder="500" style={styles.rowField} />
          <DateField label="Date" value={expenseDate} onChange={setExpenseDate} style={styles.rowField} />
        </View>
        <PrimaryButton
          title="Log expense"
          variant="secondary"
          onPress={() => expenseMutation.mutate()}
          loading={expenseMutation.isPending}
          disabled={!(expenseAccountId && Number(expenseAmount) > 0 && expenseDescription.trim() && expenseDate)}
        />
      </Card>
      {expenses.map((e) => (
        <View key={e.id} style={styles.logRow}>
          <Text style={styles.logMeta}>{e.description} · {formatDate(e.date)}</Text>
          <Text style={styles.logValue}>₹{e.amount.toFixed(2)}</Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Leaves</Text>
      <Card style={styles.formCard}>
        {leaveMutation.isError && <ErrorBanner message={apiErrorMessage(leaveMutation.error)} />}
        <SelectField label="Type" value={leaveType} onSelect={(v) => setLeaveType(v as LeaveType)} options={LEAVE_TYPES} />
        <View style={styles.row}>
          <DateField label="Start date" value={leaveStart} onChange={setLeaveStart} style={styles.rowField} />
          <DateField label="End date" value={leaveEnd} onChange={setLeaveEnd} style={styles.rowField} />
        </View>
        <PrimaryButton title="Log leave" variant="secondary" onPress={() => leaveMutation.mutate()} loading={leaveMutation.isPending} disabled={!(leaveStart && leaveEnd)} />
      </Card>
      {leaveRecords.map((l) => (
        <View key={l.id} style={styles.logRow}>
          <Text style={styles.logMeta}>{formatDate(l.startDate)} – {formatDate(l.endDate)}</Text>
          <Text style={styles.logValue}>{l.type}</Text>
        </View>
      ))}
    </RefreshableScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.canvas, flexGrow: 1 },
  hero: { backgroundColor: colors.ocean, borderRadius: radii.lg, padding: 20, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.white },
  dims: { fontSize: 13, color: "#D5E8E5", marginTop: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ocean, marginTop: 16, marginBottom: 8 },
  formCard: { marginHorizontal: 0, marginBottom: 10 },
  row: { flexDirection: "row", gap: 12 },
  rowField: { flex: 1 },
  logRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  logMeta: { fontSize: 12, color: colors.inkMuted },
  logValue: { fontSize: 13, fontWeight: "700", color: colors.ink },
});
