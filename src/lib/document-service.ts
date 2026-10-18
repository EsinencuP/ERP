import "server-only";
import { getSession, authorize } from "@/lib/auth";
import { failure, success } from "@/lib/errors";
import { schemas } from "@/lib/modules";
import { commitDocument, getWorkspaceState } from "@/lib/repository";
import { generateId } from "@/lib/utils";
import type { AuditEvent, DocumentRecord, Domain, Result, SessionContext } from "@/types/shared";

function makeEvent(session: SessionContext, record: DocumentRecord, action: AuditEvent["action"]): AuditEvent {
  return { id: generateId(), workspaceId: session.workspaceId, actor: session.name, domain: record.domain, action, title: record.data.title, createdAt: new Date().toISOString() };
}

/** Read a domain's documents after resolving the authenticated tenant. */
export async function getDocuments(domain: Domain): Promise<Result<DocumentRecord[]>> {
  const session = await getSession();
  if (!session.ok) return session;
  const state = await getWorkspaceState(session.data);
  return state.ok ? success(state.data.documents.filter((row) => row.domain === domain)) : state;
}

/** Validate, authorize and create a module document; invoice settlement is payment-only. */
export async function createDocument(domain: Domain, input: unknown): Promise<Result<DocumentRecord>> {
  const session = await getSession();
  if (!session.ok) return session;
  const permitted = authorize(session.data, domain, "create");
  if (!permitted.ok) return permitted;
  const parsed = schemas[domain].safeParse(input);
  if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Проверьте поля формы");
  if (domain === "finance" && !["Черновик", "Отправлен"].includes(parsed.data.status)) return failure("VALIDATION", "Статус оплаты определяется поступлениями");
  if (domain === "inventory") parsed.data.status = parsed.data.quantity === 0 ? "Нет в наличии" : parsed.data.quantity <= 3 ? "Мало на складе" : "В наличии";
  const stamp = new Date().toISOString();
  const record: DocumentRecord = { id: generateId(), workspaceId: session.data.workspaceId, domain, version: 1, createdAt: stamp, updatedAt: stamp, data: parsed.data };
  return commitDocument(session.data, record, makeEvent(session.data, record, "created"));
}

/** Apply a validated update with optimistic concurrency and invoice payment invariants. */
export async function updateDocument(domain: Domain, id: string, version: number, input: unknown): Promise<Result<DocumentRecord>> {
  const session = await getSession();
  if (!session.ok) return session;
  const permitted = authorize(session.data, domain, "update");
  if (!permitted.ok) return permitted;
  const parsed = schemas[domain].safeParse(input);
  if (!parsed.success) return failure("VALIDATION", parsed.error.issues[0]?.message ?? "Проверьте поля формы");
  const state = await getWorkspaceState(session.data);
  if (!state.ok) return state;
  const current = state.data.documents.find((row) => row.id === id && row.domain === domain);
  if (!current) return failure("NOT_FOUND", "Запись не найдена");
  if (current.version !== version) return failure("CONFLICT", "Запись уже изменена. Обновите страницу");
  if (domain === "finance") {
    const settled = state.data.payments.some((row) => row.documentId === id);
    if (settled && (current.data.amount !== parsed.data.amount || current.data.status !== parsed.data.status || current.data.subtitle !== parsed.data.subtitle)) return failure("CONFLICT", "У счёта есть поступления: сумму, клиента и статус изменить нельзя");
    if (!settled && !["Черновик", "Отправлен"].includes(parsed.data.status)) return failure("VALIDATION", "Зарегистрируйте поступление для изменения статуса оплаты");
  }
  if (domain === "inventory") parsed.data.status = parsed.data.quantity === 0 ? "Нет в наличии" : parsed.data.quantity <= 3 ? "Мало на складе" : "В наличии";
  const record: DocumentRecord = { ...current, version: version + 1, updatedAt: new Date().toISOString(), data: parsed.data };
  return commitDocument(session.data, record, makeEvent(session.data, record, "updated"));
}

/** Delete a versioned document; preserve invoices with a payment trail. */
export async function deleteDocument(domain: Domain, id: string, version: number): Promise<Result<DocumentRecord>> {
  const session = await getSession();
  if (!session.ok) return session;
  const permitted = authorize(session.data, domain, "delete");
  if (!permitted.ok) return permitted;
  const state = await getWorkspaceState(session.data);
  if (!state.ok) return state;
  const current = state.data.documents.find((row) => row.id === id && row.domain === domain);
  if (!current) return failure("NOT_FOUND", "Запись не найдена");
  if (current.version !== version) return failure("CONFLICT", "Запись уже изменена. Обновите страницу");
  if (state.data.payments.some((row) => row.documentId === id)) return failure("CONFLICT", "Счёт с поступлениями нельзя удалить");
  return commitDocument(session.data, current, makeEvent(session.data, current, "deleted"));
}
