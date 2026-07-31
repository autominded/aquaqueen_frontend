import { apiClient } from "./client";
import { Employee, EmployeeExpense, EmployeeStatus, LeaveRecord, LeaveType, SalaryPayment } from "./types";

export function fetchEmployees() {
  return apiClient.get<{ employees: Employee[] }>("/employees").then((r) => r.data.employees);
}

export function fetchEmployee(id: string) {
  return apiClient
    .get<{ employee: Employee; salaryPayments: SalaryPayment[]; expenses: EmployeeExpense[]; leaveRecords: LeaveRecord[] }>(
      `/employees/${id}`
    )
    .then((r) => r.data);
}

export function createEmployee(input: {
  name: string;
  designation?: string;
  phone?: string;
  monthlySalary?: number;
  joinDate: string;
  notes?: string;
}) {
  return apiClient.post<{ employee: Employee }>("/employees", input).then((r) => r.data.employee);
}

export function updateEmployee(
  id: string,
  input: Partial<{ name: string; designation: string; phone: string; monthlySalary: number; status: EmployeeStatus; notes: string }>
) {
  return apiClient.patch<{ employee: Employee }>(`/employees/${id}`, input).then((r) => r.data.employee);
}

export function deleteEmployee(id: string) {
  return apiClient.delete(`/employees/${id}`);
}

export function createSalaryPayment(
  employeeId: string,
  input: { accountId: string; amount: number; periodMonth: string; date: string; notes?: string }
) {
  return apiClient
    .post<{ payment: SalaryPayment }>(`/employees/${employeeId}/salary-payments`, input)
    .then((r) => r.data.payment);
}

export function createEmployeeExpense(
  employeeId: string,
  input: { accountId: string; amount: number; description: string; date: string; notes?: string }
) {
  return apiClient
    .post<{ expense: EmployeeExpense }>(`/employees/${employeeId}/expenses`, input)
    .then((r) => r.data.expense);
}

export function createLeaveRecord(
  employeeId: string,
  input: { type: LeaveType; startDate: string; endDate: string; notes?: string }
) {
  return apiClient.post<{ leave: LeaveRecord }>(`/employees/${employeeId}/leaves`, input).then((r) => r.data.leave);
}
