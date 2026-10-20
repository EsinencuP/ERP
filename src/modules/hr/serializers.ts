import type { Employee as EmployeeRow } from "@prisma/client";
import type { Employee } from "./types";

/** Serialize only directory/profile fields; no login or payroll data is exposed. */
export function toEmployee(row: EmployeeRow & { manager: { id: string; name: string } | null }): Employee {
  return { id: row.id, employeeId: row.employeeId, name: row.name, email: row.email, phone: row.phone, position: row.position, department: row.department, hireDate: row.hireDate.toISOString().slice(0, 10), status: row.status, managerId: row.managerId, manager: row.manager, version: row.version };
}
