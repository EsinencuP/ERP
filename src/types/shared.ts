export type ErrorCode = "VALIDATION" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "STORAGE" | "CONFIGURATION";
export type AppError = { code: ErrorCode; message: string; meta?: Record<string, unknown> };
/** Discriminated application outcome; inspect ok before accessing data or error. */
export type Result<T, E = AppError> = { ok: true; data: T } | { ok: false; error: E };
/** Page numbers are one-based; an empty collection has totalPages = 0. */
export type PaginatedResponse<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages: number };
/** Allow a caller to constrain sortable fields to an explicit string union. */
export type SortConfig<TField extends string = string> = { field: TField; direction: "asc" | "desc" };
/** JSON-compatible scalar filter value; dates are serialized as ISO strings. */
export type FilterValue = string | number | boolean | null;
/** Operator-specific values prevent invalid filter shapes at compile time. */
export type FilterConfig<TField extends string = string> =
  | { field: TField; operator: "eq" | "ne"; value: FilterValue }
  | { field: TField; operator: "contains" | "startsWith" | "endsWith"; value: string }
  | { field: TField; operator: "gt" | "gte" | "lt" | "lte"; value: string | number }
  | { field: TField; operator: "in" | "notIn"; value: readonly FilterValue[] }
  | { field: TField; operator: "isNull" | "isNotNull" };
export type Domain = "crm" | "finance" | "inventory" | "hr" | "projects";
export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "AGENT" | "READONLY";
export type Permission = "canDelete" | "canExport" | "canManageUsers" | "canViewAll";
export type SessionContext = { workspaceId: string; workspaceName: string; userId: string; name: string; email: string; role: Role; demo: boolean; expires: string };
export type DocumentRecord = { id: string; workspaceId: string; domain: Domain; version: number; createdAt: string; updatedAt: string; data: RecordData };
export type RecordData = { title: string; subtitle: string; status: string; amount: number; quantity: number; email: string; date: string; progress: number; notes: string };
export type AuditEvent = { id: string; workspaceId: string; actor: string; domain: Domain; action: "created" | "updated" | "deleted" | "payment"; title: string; createdAt: string };
export type Payment = { id: string; documentId: string; workspaceId: string; amount: number; createdAt: string; reference: string };
export type WorkspaceState = { documents: DocumentRecord[]; events: AuditEvent[]; payments: Payment[] };
export type FieldDefinition = { key: keyof RecordData; label: string; type: "text" | "email" | "money" | "number" | "date" | "textarea" | "select"; required?: boolean; options?: readonly string[] };
export type DomainDefinition = { title: string; singular: string; description: string; primaryLabel: string; secondaryLabel: string; amountLabel: string; statuses: readonly string[]; fields: readonly FieldDefinition[]; board: boolean };
