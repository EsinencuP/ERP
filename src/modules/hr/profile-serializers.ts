import type { EmployeeDocumentLink as DocumentRow, LeaveAllowance as AllowanceRow } from "@prisma/client";
import type { EmployeeDocumentLink, LeaveAllowance } from "./types";

/** Serialize employee-owned document metadata without exposing workspace/auth internals. */
export function toEmployeeDocumentLink(row: DocumentRow): EmployeeDocumentLink { return { id: row.id, employeeId: row.employeeId, title: row.title, url: row.url, notes: row.notes, version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
/** Preserve a stored leave allowance as exact whole-day text. */
export function toLeaveAllowance(row: AllowanceRow): LeaveAllowance { return { id: row.id, employeeId: row.employeeId, year: row.year, days: row.days.toFixed(0), version: row.version }; }
