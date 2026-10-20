import type { Leave as LeaveRow } from "@prisma/client";
import type { Leave } from "./types";

/** Preserve exact stored day units and expose only leave workflow/profile presentation fields. */
export function toLeave(row: LeaveRow, employee: Leave["employee"], decidedBy: string | null): Leave { return { id: row.id, employeeId: row.employeeId, employee, type: row.type, status: row.status, startDate: row.startDate.toISOString().slice(0, 10), endDate: row.endDate.toISOString().slice(0, 10), days: row.days.toFixed(2), reason: row.reason, approvedById: row.approvedById, decidedBy, version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }; }
