import "server-only";
import { db } from "@/lib/db";
import { getDemoState, withDemoState } from "@/lib/demo-store";
import { failure, success } from "@/lib/errors";
import { schemas } from "@/lib/modules";
import { domainSchema } from "@/lib/record-schema";
import { hasPermission } from "@/lib/permissions";
import type { AuditEvent, DocumentRecord, Payment, Result, SessionContext, WorkspaceState } from "@/types/shared";

/** Read only records belonging to the server-resolved tenant and validate DocType payloads. */
export async function getWorkspaceState(session: SessionContext): Promise<Result<WorkspaceState>> {
  if (!hasPermission(session.role, "canViewAll")) return failure("FORBIDDEN", "Нет права на просмотр рабочего пространства");
  if (session.demo) return getDemoState();
  try {
    const [rows, audit, receipts] = await Promise.all([
      db.document.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" } }),
      db.auditLog.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.documentPayment.findMany({ where: { workspaceId: session.workspaceId }, orderBy: { createdAt: "desc" } }),
    ]);
    const documents: DocumentRecord[] = [];
    for (const row of rows) {
      const domain = domainSchema.safeParse(row.domain);
      if (!domain.success) return failure("STORAGE", "Неизвестный тип документа в базе");
      const data = schemas[domain.data].safeParse(row.data);
      if (!data.success) return failure("STORAGE", "Документ не соответствует схеме модуля", { id: row.id });
      documents.push({ ...row, domain: domain.data, data: data.data, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
    }
    const events: AuditEvent[] = [];
    for (const row of audit) {
      const domain = domainSchema.safeParse(row.domain);
      if (domain.success && (row.action === "created" || row.action === "updated" || row.action === "deleted" || row.action === "payment")) events.push({ id: row.id, workspaceId: row.workspaceId, actor: row.actor, domain: domain.data, action: row.action, title: row.title, createdAt: row.createdAt.toISOString() });
    }
    return success({ documents, events, payments: receipts.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) });
  } catch { return failure("STORAGE", "Не удалось загрузить данные. Проверьте PostgreSQL и миграции"); }
}

/** Persist a document, payment and audit event atomically; stale versions never overwrite data. */
export async function commitDocument(session: SessionContext, record: DocumentRecord, event: AuditEvent, payment?: Payment): Promise<Result<DocumentRecord>> {
  const creating = event.action === "created";
  const deleting = event.action === "deleted";
  if (record.workspaceId !== session.workspaceId || event.workspaceId !== session.workspaceId) return failure("FORBIDDEN", "Неверное рабочее пространство");
  if (session.demo) return withDemoState((state) => {
    const current = state.documents.find((row) => row.id === record.id && row.workspaceId === session.workspaceId);
    if (!creating && (!current || current.version !== (deleting ? record.version : record.version - 1))) return failure("CONFLICT", "Запись уже изменена. Обновите страницу и повторите действие");
    if (creating && current) return failure("CONFLICT", "Запись уже существует");
    if (payment && state.payments.some((row) => row.reference === payment.reference)) return failure("CONFLICT", "Платёж с таким идентификатором уже зарегистрирован");
    state.documents = state.documents.filter((row) => row.id !== record.id);
    if (!deleting) state.documents.unshift(record);
    if (payment) state.payments.unshift(payment);
    state.events.unshift(event);
    state.events = state.events.slice(0, 50);
    return success(record);
  }, true);
  try {
    return await db.$transaction(async (tx) => {
      if (creating) await tx.document.create({ data: { id: record.id, workspaceId: session.workspaceId, domain: record.domain, version: record.version, data: { ...record.data } } });
      else if (deleting) {
        const result = await tx.document.deleteMany({ where: { id: record.id, workspaceId: session.workspaceId, domain: record.domain, version: record.version } });
        if (!result.count) return failure("CONFLICT", "Запись уже изменена. Обновите страницу");
      } else {
        const result = await tx.document.updateMany({ where: { id: record.id, workspaceId: session.workspaceId, domain: record.domain, version: record.version - 1 }, data: { data: { ...record.data }, version: { increment: 1 } } });
        if (!result.count) return failure("CONFLICT", "Запись уже изменена. Обновите страницу");
      }
      if (payment) await tx.documentPayment.create({ data: { ...payment, createdAt: new Date(payment.createdAt) } });
      await tx.auditLog.create({ data: { ...event, actorId: session.userId, entityType: record.domain, entityId: record.id, createdAt: new Date(event.createdAt) } });
      return success(record);
    });
  } catch { return failure("STORAGE", "Изменение не сохранено. Проверьте соединение и уникальность платежа"); }
}
